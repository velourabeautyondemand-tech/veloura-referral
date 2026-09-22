import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyWebsiteAdmin } from '@/lib/website-admin-auth';
import { emailService } from '@/lib/email';

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function buildAcceptUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://veloura-referral.vercel.app';
  return `${base.replace(/\/$/, '')}/team-invite/accept?token=${token}`;
}

async function verifyAdmin(request: NextRequest) {
  return verifyWebsiteAdmin(request.headers);
}

// GET: List team members
export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const members = await prisma.teamMember.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Admin team GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

// POST: Invite team member
export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { role, permissions } = body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    if (role !== undefined && !['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Choose a valid team role' }, { status: 400 });
    }

    // Check if already invited
    const existing = await prisma.teamMember.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'This email has already been invited' }, { status: 400 });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenExpiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

    const member = await prisma.teamMember.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: role || 'VIEWER',
        permissions: permissions || [],
        invitedBy: user.id,
        status: 'PENDING',
        invitationToken,
        invitationTokenExpiresAt,
      },
    });

    const emailResult = await emailService.sendTeamInvitation({
      email: member.email,
      name: member.name,
      role: member.role,
      inviterName: user.name,
      acceptUrl: buildAcceptUrl(invitationToken),
    });

    return NextResponse.json({
      success: true,
      member,
      emailSent: emailResult.success,
      ...(emailResult.success ? {} : { emailWarning: 'Team member saved, but the invitation email could not be sent. Use Resend to try again.' }),
    });
  } catch (error) {
    console.error('Admin team POST error:', error);
    return NextResponse.json({ error: 'Failed to invite team member' }, { status: 500 });
  }
}

// PUT: Update team member
export async function PUT(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Team member ID required' }, { status: 400 });
    }

    if (body.status !== undefined && !['PENDING', 'ACTIVE', 'DEACTIVATED'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid member status' }, { status: 400 });
    }

    // Re-send an invitation: refreshes the token/expiry (in case the first
    // one expired or the email never arrived) and re-sends the email.
    // Doesn't touch name/role/permissions.
    if (body.resendInvite === true) {
      const existing = await prisma.teamMember.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
      }
      if (existing.status !== 'PENDING') {
        return NextResponse.json({ error: 'Only pending invitations can be resent' }, { status: 400 });
      }

      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationTokenExpiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
      const member = await prisma.teamMember.update({
        where: { id },
        data: { invitationToken, invitationTokenExpiresAt },
      });

      const emailResult = await emailService.sendTeamInvitation({
        email: member.email,
        name: member.name,
        role: member.role,
        inviterName: user.name,
        acceptUrl: buildAcceptUrl(invitationToken),
      });

      return NextResponse.json({
        success: true,
        member,
        emailSent: emailResult.success,
        ...(emailResult.success ? {} : { emailWarning: 'Could not send the invitation email. Please try again.' }),
      });
    }

    // Only allow specific fields (prevent mass assignment)
    const allowedFields = ['name', 'email', 'role', 'permissions', 'status'];
    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) updates[key] = body[key];
    }

    const member = await prisma.teamMember.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Admin team PUT error:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

// DELETE: Remove team member
export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team member ID required' }, { status: 400 });
    }

    await prisma.teamMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin team DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
