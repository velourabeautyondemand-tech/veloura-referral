import { prisma } from './prisma';
import crypto from 'crypto';
import { evaluateOtpAttempt, MAX_OTP_ATTEMPTS } from './otp-attempts';
import { getWebsiteAdminIdentity, type WebsiteAdminIdentity } from './website-admin-auth';

type OtpFailureStage =
  | 'configuration'
  | 'admin_authorization'
  | 'otp_rate_limit'
  | 'otp_invalidation'
  | 'otp_persistence'
  | 'resend_send'
  | 'otp_cleanup';

function safeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { type: 'UnknownError' };
  const candidate = error as Error & { code?: unknown; statusCode?: unknown };
  const message = error.message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/\bre_[A-Za-z0-9_-]+\b/g, '[REDACTED_API_KEY]')
    .slice(0, 500);
  return {
    type: error.name,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    statusCode: typeof candidate.statusCode === 'number' ? candidate.statusCode : undefined,
    message,
  };
}

function logOtpFailure(event: string, stage: OtpFailureStage, error: unknown) {
  console.error(event, { stage, ...safeErrorDetails(error) });
}

export class OTPService {
  // Generate a cryptographically secure 6-digit OTP
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate and send OTP via email
  async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    let stage: OtpFailureStage = 'configuration';
    try {
      const normalizedEmail = email.toLowerCase().trim();
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        console.error('otp_send_configuration_missing', {
          hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
          hasResendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL),
        });
        return { success: false, message: 'OTP email is not configured' };
      }

      stage = 'admin_authorization';
      const admin = getWebsiteAdminIdentity(normalizedEmail);
      if (!admin) {
        return {
          success: false,
          message: 'No account found with this email address'
        };
      }

      // Check for recent OTP attempts (rate limiting)
      stage = 'otp_rate_limit';
      const recentOTP = await prisma.otp.findFirst({
        where: {
          email: normalizedEmail,
          createdAt: {
            gte: new Date(Date.now() - 60000) // Within last minute
          }
        }
      });

      if (recentOTP) {
        return {
          success: false,
          message: 'Please wait 1 minute before requesting another OTP'
        };
      }

      // Invalidate any existing unused OTPs for this email
      stage = 'otp_invalidation';
      await prisma.otp.updateMany({
        where: {
          email: normalizedEmail,
          isUsed: false
        },
        data: {
          isUsed: true
        }
      });

      // Generate new OTP
      const code = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      stage = 'otp_persistence';
      const otp = await prisma.otp.create({
        data: {
          email: normalizedEmail,
          code,
          expiresAt
        }
      });

      // Send OTP email
      stage = 'resend_send';
      const { Resend } = await import('resend');
      const resendClient = new Resend(process.env.RESEND_API_KEY);
      const emailResult = await resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL.trim(),
        to: normalizedEmail,
        subject: 'Your VÉLOURA Beauty on Demand login code',
        html: this.generateOTPEmailTemplate(code, admin.name)
      });

      if (emailResult.error) {
        logOtpFailure('otp_resend_rejected', stage, emailResult.error);
        stage = 'otp_cleanup';
        try {
          await prisma.otp.delete({ where: { id: otp.id } });
        } catch (cleanupError) {
          logOtpFailure('otp_cleanup_failed', stage, cleanupError);
        }
        return {
          success: false,
          message: 'Failed to send OTP email. Please try again.'
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully to your email'
      };

    } catch (error) {
      logOtpFailure('otp_send_failed', stage, error);
      return {
        success: false,
        message: 'An error occurred while sending OTP'
      };
    }
  }

  // Verify OTP and return user if valid
  async verifyOTP(email: string, code: string): Promise<{
    success: boolean;
    user?: WebsiteAdminIdentity;
    message: string;
  }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const admin = getWebsiteAdminIdentity(normalizedEmail);
      if (!admin) {
        return {
          success: false,
          message: 'Invalid or expired OTP'
        };
      }

      // Find the current active OTP for this email. The submitted code must not
      // be part of this lookup, otherwise a wrong code cannot increment the
      // active OTP's failed-attempt count.
      const otp = await prisma.otp.findFirst({
        where: {
          email: normalizedEmail,
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!otp) {
        return {
          success: false,
          message: 'Invalid or expired OTP'
        };
      }

      const attempt = evaluateOtpAttempt(otp, code);

      if (!attempt.valid) {
        await prisma.otp.update({
          where: { id: otp.id },
          data: {
            attempts: { increment: 1 },
            ...(attempt.invalidate ? { isUsed: true } : {}),
          }
        });

        return {
          success: false,
          message: attempt.invalidate
            ? `Too many invalid attempts. Please request a new OTP.`
            : `Invalid or expired OTP. ${MAX_OTP_ATTEMPTS - otp.attempts - 1} attempts remaining.`
        };
      }

      // Mark OTP as used
      await prisma.otp.update({
        where: { id: otp.id },
        data: { isUsed: true }
      });

      return {
        success: true,
        user: admin,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('otp_verify_failed', safeErrorDetails(error));
      return {
        success: false,
        message: 'An error occurred while verifying OTP'
      };
    }
  }

  // Clean up expired OTPs (should be run periodically)
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      await prisma.otp.deleteMany({
        where: {
          OR: [
            {
              expiresAt: {
                lt: new Date()
              }
            },
            {
              isUsed: true,
              createdAt: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours old
              }
            }
          ]
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  // Generate OTP email template
  private generateOTPEmailTemplate(code: string, userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Login Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .otp-code {
              background-color: #f3f4f6;
              border: 2px dashed #d1d5db;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
              border-radius: 8px;
            }
            .code {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #1f2937;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${process.env.PLATFORM_NAME || 'VÉLOURA Beauty on Demand'}</div>
              <h1>Your Login Code</h1>
            </div>
            
            <p>Hello ${userName},</p>
            <p>You requested to sign in to your account. Please use the verification code below:</p>
            
            <div class="otp-code">
              <div class="code">${code}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280;">This code expires in 10 minutes</p>
            </div>
            
            <div class="warning">
              <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
            </div>
            
            <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>
            
            <div class="footer">
              <p>Best regards,<br>
              ${process.env.PLATFORM_NAME || 'VÉLOURA Beauty on Demand'} Team</p>
              <p>
                Need help? Contact us at 
                <a href="mailto:${process.env.PLATFORM_SUPPORT_EMAIL || 'support@velourabeautyondemand.com'}" style="color: #2563eb;">
                  ${process.env.PLATFORM_SUPPORT_EMAIL || 'support@velourabeautyondemand.com'}
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const otpService = new OTPService();
