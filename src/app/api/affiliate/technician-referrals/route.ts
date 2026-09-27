import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/website-referrals';

type ReferralRow = {
  id: string;
  technicianName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  onboardingCompletedAt: Date | null;
  rewardStatus: 'PENDING' | 'EARNED' | 'PAID';
  rewardAmountCents: number;
  createdAt: Date;
  earnedAt: Date | null;
  paidAt: Date | null;
};

// Partner view of their technician referrals ($10 per approved technician).
// Referrals are matched to the partner by referrer email, which covers both
// partner-link applications and older ones where the email was typed in.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliate: { select: { referralCode: true } } },
    });

    if (!user || user.role !== 'AFFILIATE' || user.status !== 'ACTIVE' || !user.affiliate) {
      return NextResponse.json({ error: 'Partner account required' }, { status: 403 });
    }

    const referrals: ReferralRow[] = await prisma.websiteReferral.findMany({
      where: { referrerEmail: normalizeEmail(user.email) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        technicianName: true,
        status: true,
        onboardingCompletedAt: true,
        rewardStatus: true,
        rewardAmountCents: true,
        createdAt: true,
        earnedAt: true,
        paidAt: true,
      },
    });

    const sum = (items: ReferralRow[]) => items.reduce((total: number, r: ReferralRow) => total + r.rewardAmountCents, 0);
    const totals = {
      submitted: referrals.length,
      approved: referrals.filter((r: ReferralRow) => r.status === 'APPROVED').length,
      pendingCents: sum(referrals.filter((r: ReferralRow) => r.status !== 'REJECTED' && r.rewardStatus === 'PENDING')),
      earnedCents: sum(referrals.filter((r: ReferralRow) => r.rewardStatus === 'EARNED')),
      paidCents: sum(referrals.filter((r: ReferralRow) => r.rewardStatus === 'PAID')),
    };

    return NextResponse.json({
      success: true,
      referralCode: user.affiliate.referralCode,
      referrals,
      totals,
    });
  } catch (error) {
    console.error('partner_technician_referrals_failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Unable to load technician referrals' }, { status: 500 });
  }
}
