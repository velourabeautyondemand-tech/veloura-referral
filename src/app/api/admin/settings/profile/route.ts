import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebsiteAdmin } from '@/lib/website-admin-auth';

// GET /api/admin/settings/profile - Get current user profile
export async function GET(req: NextRequest) {
  try {
    const user = verifyWebsiteAdmin(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // NOTE: admin sign-in has no backing row in the `users` table (see
    // verifyWebsiteAdmin), so return the session identity directly instead
    // of looking it up — a DB lookup by this id will always come back empty.
    return NextResponse.json({
      success: true,
      profile: user,
    });
  } catch (error) {
    console.error('GET /api/admin/settings/profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/profile - Update user profile
export async function PUT(req: NextRequest) {
  try {
    const user = verifyWebsiteAdmin(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // NOTE: admin sign-in has no backing row in the `users` table (see
    // verifyWebsiteAdmin), so prisma.user.update below will fail (record
    // not found) for the admin. Editing the admin's own name/email here
    // needs a redesign — it can't persist to a `users` row that never
    // existed — so this endpoint still won't fully work after this fix.

    const body = await req.json();
    const { name, email, profilePicture } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        profilePicture: profilePicture || null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/admin/settings/profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
