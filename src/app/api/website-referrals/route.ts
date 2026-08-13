import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { websiteReferralSchema } from '@/lib/validations';
import { normalizeEmail, WEBSITE_REFERRAL_REWARD_CENTS } from '@/lib/website-referrals';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const rateLimit = await checkRateLimit(ip, 'website-referrals', 5, 60 * 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many referral submissions. Please try again later.' },
      { status: 429 }
    );
  }

  const parsed = websiteReferralSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please correct the referral details.', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const referral = await prisma.websiteReferral.create({
      data: {
        referrerEmail: normalizeEmail(parsed.data.referrerEmail),
        technicianName: parsed.data.technicianName.trim(),
        technicianEmail: normalizeEmail(parsed.data.technicianEmail),
        technicianPhone: parsed.data.technicianPhone.trim(),
        rewardAmountCents: WEBSITE_REFERRAL_REWARD_CENTS,
      },
      select: { id: true, status: true, rewardStatus: true, createdAt: true },
    });

    return NextResponse.json(
      { success: true, message: 'Referral submitted for VÉLOURA review.', referral },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This technician has already been referred.' },
        { status: 409 }
      );
    }
    console.error('Website referral submission failed:', error);
    return NextResponse.json({ error: 'Unable to save the referral.' }, { status: 500 });
  }
}
