import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebsiteAdmin } from '@/lib/website-admin-auth';

export async function GET(request: NextRequest) {
  try {
    const admin = verifyWebsiteAdmin(request.headers);

    if (admin) {
      return NextResponse.json({
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          hasAffiliate: admin.hasAffiliate,
        }
      });
    }

    // Partner session: middleware only forwards these headers after the JWT
    // is verified. Re-check the database so deactivated partners lose access.
    const role = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    if (role === 'AFFILIATE' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { affiliate: { select: { id: true } } },
      });

      if (user && user.role === 'AFFILIATE' && user.status === 'ACTIVE') {
        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'AFFILIATE',
            hasAffiliate: Boolean(user.affiliate),
            profilePicture: user.profilePicture ?? undefined,
          }
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );

  } catch (error) {
    console.error('session_check_failed', {
      type: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
