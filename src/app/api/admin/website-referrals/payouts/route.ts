import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteAdminFromHeaders } from '@/lib/website-admin-auth';
import { runTechnicianPayouts } from '@/lib/technician-payouts';
import { StripeNotConfiguredError } from '@/lib/stripe-connect';

// Admin "Pay earned rewards now" - same logic as the Friday cron.
export async function POST(request: NextRequest) {
  const admin = getWebsiteAdminFromHeaders(request.headers);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const summary = await runTechnicianPayouts(admin.id);
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('admin_payout_run_failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Payout run failed' }, { status: 500 });
  }
}
