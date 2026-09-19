import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebsiteAdmin } from '@/lib/website-admin-auth';

/**
 * GET /api/admin/profile - Get admin profile
 */
export async function GET(request: NextRequest) {
  try {
    const user = verifyWebsiteAdmin(request.headers);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error) {
    console.error('GET /api/admin/profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/profile - Update admin profile
 */
export async function PUT(request: NextRequest) {
  try {
    const user = verifyWebsiteAdmin(request.headers);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // NOTE: admin sign-in has no backing row in the `users` table (see
    // verifyWebsiteAdmin), so there is nothing here for prisma.user.update
    // to persist to. This will currently fail below with a 500 until admin
    // profile editing is redesigned to not depend on a `users` row.

    // Get update data from request
    const body = await request.json();
    const { name, profilePicture } = body;

    // Validate input
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        ...(profilePicture && { profilePicture }),
      }
    });

    // Return updated profile (without password)
    const { password, ...userProfile } = updatedUser;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: userProfile,
    });

  } catch (error) {
    console.error('PUT /api/admin/profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
