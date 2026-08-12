import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateOtpAttempt } from '../src/lib/otp-attempts.ts';

test('wrong OTP increments attempts on the current active OTP', () => {
  assert.deepEqual(
    evaluateOtpAttempt({ code: '123456', attempts: 0 }, '000000'),
    { valid: false, incrementAttempts: true, invalidate: false }
  );
});

test('third failed attempt invalidates the current active OTP', () => {
  assert.deepEqual(
    evaluateOtpAttempt({ code: '123456', attempts: 2 }, '000000'),
    { valid: false, incrementAttempts: true, invalidate: true }
  );
});

test('correct OTP still works before invalidation', () => {
  assert.deepEqual(
    evaluateOtpAttempt({ code: '123456', attempts: 2 }, '123456'),
    { valid: true, incrementAttempts: false, invalidate: true }
  );
});
