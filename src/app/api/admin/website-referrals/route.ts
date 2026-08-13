import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWebsiteAdminFromHeaders } from '@/lib/website-admin-auth';

export async function GET(request: NextRequest) {
  if (!getWebsiteAdminFromHeaders(request.headers)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const referrals = await prisma.websiteReferral.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ success: true, referrals });
}
