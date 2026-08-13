export const MAX_OTP_ATTEMPTS = 3;

export type ActiveOtp = {
  code: string;
  attempts: number;
};

export type OtpAttemptResult =
  | { valid: true; invalidate: true; incrementAttempts: false }
  | { valid: false; invalidate: boolean; incrementAttempts: true };

export function evaluateOtpAttempt(otp: ActiveOtp, submittedCode: string): OtpAttemptResult {
  if (otp.code === submittedCode) {
    return { valid: true, invalidate: true, incrementAttempts: false };
  }

  return {
    valid: false,
    incrementAttempts: true,
    invalidate: otp.attempts + 1 >= MAX_OTP_ATTEMPTS,
  };
}
