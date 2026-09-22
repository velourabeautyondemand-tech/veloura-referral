import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public by design (not under /api/admin, so middleware.ts does not gate
// it) - the person accepting an invitation is not signed in yet. Security
// comes from the invitation token itself: a 32-byte random value, emailed
// only to the invitee, single-use (cleared on acceptance) and time-limited.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (!token) {
      return NextResponse.json({ error: 'Missing invitation token' }, { status: 400 });
    }

    const member = await prisma.teamMember.findUnique({ where: { invitationToken: token } });

    if (!member) {
      return NextResponse.json({ error: 'This invitation link is invalid or has already been used.' }, { status: 404 });
    }

    if (member.status !== 'PENDING') {
      return NextResponse.json({ error: 'This invitation has already been accepted or is no longer pending.' }, { status: 400 });
    }

    if (!member.invitationTokenExpiresAt || member.invitationTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation link has expired. Ask an admin to resend it.' }, { status: 400 });
    }

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: {
        status: 'ACTIVE',
        acceptedAt: new Date(),
        invitationToken: null,
        invitationTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true, email: updated.email, name: updated.name });
  } catch (error) {
    console.error('Team invite accept error:', error);
    return NextResponse.json({ error: 'Unable to accept this invitation. Please try again.' }, { status: 500 });
  }
}
