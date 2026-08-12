import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteAdminFromHeaders, getWebsiteAdminIdentity } from '@/lib/website-admin-auth';

export async function GET(request: NextRequest) {
  try {
    const sessionAdmin = getWebsiteAdminFromHeaders(request.headers);
    const email = request.headers.get('x-user-email');
    const admin = email ? getWebsiteAdminIdentity(email) : null;

    if (!sessionAdmin || !admin || sessionAdmin.id !== admin.id) {
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
