import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const referrals = await prisma.websiteReferral.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ success: true, referrals });
}
