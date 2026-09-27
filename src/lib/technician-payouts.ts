import { createHash } from 'crypto';
import { prisma } from './prisma';
import { createTransfer, getAccount, isStripeConfigured, readStripeDetails, StripeNotConfiguredError } from './stripe-connect';

const DEFAULT_MIN_PAYOUT_CENTS = 1000; // $10

export type PartnerPayoutResult = {
  email: string;
  name?: string;
  amountCents: number;
  referralCount: number;
  status: 'paid' | 'skipped' | 'failed';
  reason?: string;
  transferId?: string;
};

type EarnedRow = { id: string; referrerEmail: string; rewardAmountCents: number };

// Pays every partner's EARNED technician rewards with one Stripe transfer per
// partner, then marks those referrals PAID. Safe to re-run: the transfer uses
// an idempotency key derived from the exact referral IDs being paid, and
// referrals are only marked PAID after Stripe confirms the transfer.
export async function runTechnicianPayouts(createdBy: string): Promise<{
  minPayoutCents: number;
  results: PartnerPayoutResult[];
}> {
  if (!isStripeConfigured()) throw new StripeNotConfiguredError();

  const settings = await prisma.programSettings.findFirst();
  const minPayoutCents = settings?.minPayoutCents && settings.minPayoutCents > 0
    ? settings.minPayoutCents
    : DEFAULT_MIN_PAYOUT_CENTS;

  const earned: EarnedRow[] = await prisma.websiteReferral.findMany({
    where: { rewardStatus: 'EARNED' },
    select: { id: true, referrerEmail: true, rewardAmountCents: true },
    orderBy: { createdAt: 'asc' },
  });

  const byEmail = new Map<string, EarnedRow[]>();
  for (const row of earned) {
    const email = row.referrerEmail.trim().toLowerCase();
    byEmail.set(email, [...(byEmail.get(email) || []), row]);
  }

  const results: PartnerPayoutResult[] = [];

  for (const [email, rows] of byEmail) {
    const amountCents = rows.reduce((sum: number, r: EarnedRow) => sum + r.rewardAmountCents, 0);
    const base = { email, amountCents, referralCount: rows.length };

    const user = await prisma.user.findUnique({ where: { email }, include: { affiliate: true } });
    if (!user || user.role !== 'AFFILIATE' || !user.affiliate) {
      results.push({ ...base, status: 'skipped', reason: 'No partner account for this referrer email' });
      continue;
    }
    if (user.status !== 'ACTIVE') {
      results.push({ ...base, name: user.name, status: 'skipped', reason: 'Partner account is not active' });
      continue;
    }
    if (amountCents < minPayoutCents) {
      results.push({ ...base, name: user.name, status: 'skipped', reason: `Below $${(minPayoutCents / 100).toFixed(2)} minimum` });
      continue;
    }

    const { stripeAccountId } = readStripeDetails(user.affiliate.payoutDetails);
    if (!stripeAccountId) {
      results.push({ ...base, name: user.name, status: 'skipped', reason: 'Partner has not connected Stripe' });
      continue;
    }

    try {
      const account = await getAccount(stripeAccountId);
      if (!account.payouts_enabled) {
        results.push({ ...base, name: user.name, status: 'skipped', reason: 'Stripe setup not finished' });
        continue;
      }

      const referralIds = rows.map((r: EarnedRow) => r.id).sort();
      const idempotencyKey = 'tech-payout-' + createHash('sha256').update(referralIds.join(',')).digest('hex').slice(0, 40);

      const transfer = await createTransfer({
        amountCents,
        destination: stripeAccountId,
        description: `VÉLOURA technician referral rewards (${rows.length})`,
        metadata: { affiliate_id: user.affiliate.id, referral_count: String(rows.length) },
      }, idempotencyKey);

      const now = new Date();
      await prisma.$transaction([
        prisma.websiteReferral.updateMany({
          where: { id: { in: referralIds }, rewardStatus: 'EARNED' },
          data: { rewardStatus: 'PAID', paidAt: now },
        }),
        prisma.payout.create({
          data: {
            affiliateId: user.affiliate.id,
            userId: user.id,
            amountCents,
            commissionCount: rows.length,
            method: 'STRIPE_CONNECT',
            status: 'COMPLETED',
            processedAt: now,
            createdBy,
            notes: `Technician referral rewards. Stripe transfer ${transfer.id}. Referrals: ${referralIds.join(', ')}`,
          },
        }),
      ]);

      results.push({ ...base, name: user.name, status: 'paid', transferId: transfer.id });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.error('technician_payout_failed', { email, reason });
      results.push({ ...base, name: user.name, status: 'failed', reason });
    }
  }

  return { minPayoutCents, results };
}
