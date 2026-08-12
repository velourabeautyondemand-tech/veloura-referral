import assert from 'node:assert/strict';
import test from 'node:test';
import { earnedRewardUpdate, normalizeEmail, WEBSITE_REFERRAL_REWARD_CENTS } from '../src/lib/website-referrals.ts';

const now = new Date('2026-08-12T00:00:00.000Z');

test('new referrals remain pending and use a $10 reward', () => {
  assert.equal(WEBSITE_REFERRAL_REWARD_CENTS, 1000);
  assert.deepEqual(earnedRewardUpdate({ status: 'PENDING', onboardingCompletedAt: null, rewardStatus: 'PENDING', earnedAt: null }, now), {});
});

test('approval alone does not earn the reward', () => {
  assert.deepEqual(earnedRewardUpdate({ status: 'APPROVED', onboardingCompletedAt: null, rewardStatus: 'PENDING', earnedAt: null }, now), {});
});

test('onboarding alone does not earn the reward', () => {
  assert.deepEqual(earnedRewardUpdate({ status: 'PENDING', onboardingCompletedAt: now, rewardStatus: 'PENDING', earnedAt: null }, now), {});
});

test('approval plus onboarding earns the reward exactly once', () => {
  assert.deepEqual(
    earnedRewardUpdate({ status: 'APPROVED', onboardingCompletedAt: now, rewardStatus: 'PENDING', earnedAt: null }, now),
    { rewardStatus: 'EARNED', earnedAt: now }
  );
  assert.deepEqual(earnedRewardUpdate({ status: 'APPROVED', onboardingCompletedAt: now, rewardStatus: 'EARNED', earnedAt: now }, now), {});
});

test('technician emails normalize for database uniqueness', () => {
  assert.equal(normalizeEmail('  TECH@example.com '), 'tech@example.com');
});
