import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { websiteReferralSchema } from '@/lib/validations';
import { normalizeEmail, WEBSITE_REFERRAL_REWARD_CENTS } from '@/lib/website-referrals';
import { findActivePartnerByCode } from '@/lib/partner-lookup';

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

  let referrerName = parsed.data.referrerName.trim();
  let referrerEmail = normalizeEmail(parsed.data.referrerEmail);

  // Partner link (?ref=CODE): attribute to the partner account automatically.
  if (parsed.data.refCode) {
    const partner = await findActivePartnerByCode(parsed.data.refCode);
    if (!partner) {
      return NextResponse.json(
        { error: 'This referral link is no longer valid. Please ask your referrer for a new link.' },
        { status: 400 }
      );
    }
    referrerName = partner.name;
    referrerEmail = normalizeEmail(partner.email);
  }

  if (referrerEmail === normalizeEmail(parsed.data.technicianEmail)) {
    return NextResponse.json(
      { error: 'You cannot refer yourself.' },
      { status: 400 }
    );
  }

  try {
    const referral = await prisma.websiteReferral.create({
      data: {
        referrerName,
        referrerEmail,
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
