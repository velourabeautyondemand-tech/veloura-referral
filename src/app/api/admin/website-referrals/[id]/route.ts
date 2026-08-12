import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { earnedRewardUpdate } from '@/lib/website-referrals';

type AdminAction = 'approve' | 'reject' | 'complete_onboarding' | 'mark_paid';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { action, reviewNotes } = await request.json() as { action?: AdminAction; reviewNotes?: string };
  if (!action || !['approve', 'reject', 'complete_onboarding', 'mark_paid'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const referral = await prisma.$transaction(async (tx) => {
      const current = await tx.websiteReferral.findUnique({ where: { id } });
      if (!current) throw new Error('NOT_FOUND');

      const now = new Date();
      if (action === 'reject') {
        if (current.rewardStatus !== 'PENDING') throw new Error('REWARD_ALREADY_EARNED');
        return tx.websiteReferral.update({
          where: { id },
          data: { status: 'REJECTED', reviewedBy: user.id, reviewedAt: now, reviewNotes: reviewNotes?.trim() || null },
        });
      }

      if (action === 'mark_paid') {
        if (current.rewardStatus !== 'EARNED') throw new Error('REWARD_NOT_EARNED');
        return tx.websiteReferral.update({
          where: { id },
          data: { rewardStatus: 'PAID', paidAt: now },
        });
      }

      if (action === 'complete_onboarding' && current.status === 'REJECTED') {
        throw new Error('REFERRAL_REJECTED');
      }

      const next = {
        ...current,
        status: action === 'approve' ? 'APPROVED' as const : current.status,
        onboardingCompletedAt: action === 'complete_onboarding' ? now : current.onboardingCompletedAt,
      };
      return tx.websiteReferral.update({
        where: { id },
        data: {
          ...(action === 'approve' ? {
            status: 'APPROVED' as const,
            reviewedBy: user.id,
            reviewedAt: now,
            reviewNotes: reviewNotes?.trim() || null,
          } : { onboardingCompletedAt: now }),
          ...earnedRewardUpdate(next, now),
        },
      });
    }, { isolationLevel: 'Serializable' });

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'NOT_FOUND') return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    if (message === 'REWARD_NOT_EARNED') return NextResponse.json({ error: 'Reward must be earned before it can be paid.' }, { status: 409 });
    if (message === 'REWARD_ALREADY_EARNED') return NextResponse.json({ error: 'An earned or paid referral cannot be rejected.' }, { status: 409 });
    if (message === 'REFERRAL_REJECTED') return NextResponse.json({ error: 'Onboarding cannot be completed for a rejected referral.' }, { status: 409 });
    console.error('Website referral admin update failed:', error);
    return NextResponse.json({ error: 'Unable to update referral.' }, { status: 500 });
  }
}
