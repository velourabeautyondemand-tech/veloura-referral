import type { ReferralRewardStatus, WebsiteReferralStatus } from '@prisma/client';

export const WEBSITE_REFERRAL_REWARD_CENTS = 1000;

export type RewardInputs = {
  status: WebsiteReferralStatus;
  onboardingCompletedAt: Date | null;
  rewardStatus: ReferralRewardStatus;
  earnedAt: Date | null;
};

export function earnedRewardUpdate(referral: RewardInputs, now = new Date()) {
  if (
    referral.status === 'APPROVED' &&
    referral.onboardingCompletedAt &&
    referral.rewardStatus === 'PENDING'
  ) {
    return { rewardStatus: 'EARNED' as const, earnedAt: referral.earnedAt ?? now };
  }

  return {};
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
