import { NextRequest, NextResponse } from 'next/server';
import { runTechnicianPayouts } from '@/lib/technician-payouts';
import { StripeNotConfiguredError } from '@/lib/stripe-connect';

// Called by Vercel Cron every Friday (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runTechnicianPayouts('weekly-cron');
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    console.error('weekly_payouts_failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Weekly payouts failed' }, { status: 500 });
  }
}
