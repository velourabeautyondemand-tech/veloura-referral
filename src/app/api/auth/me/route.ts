import { NextRequest, NextResponse } from 'next/server';
import { verifyWebsiteAdmin } from '@/lib/website-admin-auth';

export async function GET(request: NextRequest) {
  try {
    const admin = verifyWebsiteAdmin(request.headers);

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        hasAffiliate: admin.hasAffiliate,
      }
    });

  } catch (error) {
    console.error('website_admin_session_check_failed', {
      type: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
