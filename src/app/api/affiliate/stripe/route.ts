import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSignedInPartner } from '@/lib/partner-session';
import {
  createExpressAccount,
  createLoginLink,
  createOnboardingLink,
  getAccount,
  isStripeConfigured,
  readStripeDetails,
} from '@/lib/stripe-connect';

async function saveStripeDetails(affiliateId: string, current: unknown, patch: Record<string, unknown>) {
  const base = current && typeof current === 'object' ? (current as Record<string, unknown>) : {};
  await prisma.affiliate.update({
    where: { id: affiliateId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { payoutDetails: { ...base, ...patch } as any },
  });
}

// GET: the partner's Stripe payout status (refreshed from Stripe).
export async function GET(request: NextRequest) {
  const partner = await getSignedInPartner(request);
  if (!partner) return NextResponse.json({ error: 'Partner account required' }, { status: 403 });

  if (!isStripeConfigured()) {
    return NextResponse.json({ configured: false, connected: false, payoutsEnabled: false });
  }

  const details = readStripeDetails(partner.affiliate.payoutDetails);
  if (!details.stripeAccountId) {
    return NextResponse.json({ configured: true, connected: false, payoutsEnabled: false });
  }

  try {
    const account = await getAccount(details.stripeAccountId);
    if (account.payouts_enabled !== details.stripePayoutsEnabled) {
      await saveStripeDetails(partner.affiliate.id, partner.affiliate.payoutDetails, {
        stripePayoutsEnabled: account.payouts_enabled,
      });
    }
    return NextResponse.json({
      configured: true,
      connected: true,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error) {
    console.error('partner_stripe_status_failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Unable to check Stripe status' }, { status: 502 });
  }
}

// POST { action: 'onboard' | 'dashboard' } -> { url } to redirect the partner to Stripe.
export async function POST(request: NextRequest) {
  const partner = await getSignedInPartner(request);
  if (!partner) return NextResponse.json({ error: 'Partner account required' }, { status: 403 });
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe payouts are not switched on yet. Please check back soon.' }, { status: 503 });
  }

  const { action } = (await request.json().catch(() => ({}))) as { action?: string };
  const origin = request.nextUrl.origin;

  try {
    let { stripeAccountId } = readStripeDetails(partner.affiliate.payoutDetails);

    if (action === 'dashboard') {
      if (!stripeAccountId) return NextResponse.json({ error: 'Connect Stripe first.' }, { status: 400 });
      const link = await createLoginLink(stripeAccountId);
      return NextResponse.json({ url: link.url });
    }

    if (!stripeAccountId) {
      const account = await createExpressAccount(partner.user.email, partner.affiliate.id);
      stripeAccountId = account.id;
      await saveStripeDetails(partner.affiliate.id, partner.affiliate.payoutDetails, {
        stripeAccountId,
        stripePayoutsEnabled: false,
      });
    }

    const link = await createOnboardingLink(stripeAccountId, origin);
    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error('partner_stripe_link_failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Unable to open Stripe. Please try again.' }, { status: 502 });
  }
}
