import { z } from 'zod';

// Referral Validation
export const referralSchema = z.object({
    leadName: z.string().min(2, 'Name must be at least 2 characters'),
    leadEmail: z.string().email('Invalid email address'),
    company: z.string().optional(),
    notes: z.string().optional(),
    estimatedValue: z.number().min(0).max(999999999).optional(),
});

// When `refCode` is present (partner link), the referrer is taken from the
// partner account on the server and the typed referrer fields are ignored.
export const websiteReferralSchema = z.object({
    refCode: z.string().trim().min(1).max(64).optional(),
    referrerName: z.string().trim().max(120).optional().default(''),
    referrerEmail: z.string().trim().max(254).optional().default(''),
    technicianName: z.string().trim().min(2, 'Technician name must be at least 2 characters').max(120),
    technicianEmail: z.string().trim().email('Enter a valid technician email'),
    technicianPhone: z.string().trim().min(7, 'Enter a valid technician phone number').max(30),
}).superRefine((data, ctx) => {
    if (data.refCode) return;
    if (data.referrerName.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referrerName'], message: 'Enter the name of who referred you' });
    }
    if (!z.string().email().safeParse(data.referrerEmail).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referrerEmail'], message: 'Enter a valid referrer email' });
    }
});

// Affiliate Creation Validation (Admin)
export const affiliateCreateSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// Payout Validation
export const payoutSchema = z.object({
    affiliateId: z.string(),
    commissionIds: z.array(z.string()).min(1, 'At least one commission is required'),
    method: z.string().optional(),
    notes: z.string().optional(),
});

// Payout Status Update Validation
export const payoutUpdateSchema = z.object({
    id: z.string(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
    method: z.string().optional(),
    notes: z.string().optional(),
});

// Program Settings Validation
export const programSettingsSchema = z.object({
    productName: z.string().min(1),
    programName: z.string().min(1),
    websiteUrl: z.string().url(),
    currency: z.string().length(3),
    minPayoutCents: z.number().min(0),
    cookieDuration: z.number().int().min(1),
});
