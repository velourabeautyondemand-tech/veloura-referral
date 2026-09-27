import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { findActivePartnerByCode } from '@/lib/partner-lookup';

// Public: resolves a partner referral code to the partner's display name so the
// application page can show "Referred by …". Never returns the email.
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const rateLimit = await checkRateLimit(ip, 'website-referrals/referrer', 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const code = request.nextUrl.searchParams.get('code') || '';
  if (!code || code.length > 64) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const partner = await findActivePartnerByCode(code);
  if (!partner) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({ valid: true, name: partner.name });
}
