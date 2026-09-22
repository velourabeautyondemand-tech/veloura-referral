import { createHash } from 'crypto';
import { prisma } from './prisma';

export type WebsiteAdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
  status: 'ACTIVE';
  hasAffiliate: false;
};

export function parseWebsiteAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value || '')
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getWebsiteAdminIdentity(
  email: string,
  configuredEmails = process.env.ADMIN_EMAILS
): WebsiteAdminIdentity | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!parseWebsiteAdminEmails(configuredEmails).has(normalizedEmail)) {
    return null;
  }

  const stableId = createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24);
  return {
    id: `website-admin-${stableId}`,
    email: normalizedEmail,
    name: 'VÉLOURA Beauty on Demand Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    hasAffiliate: false,
  };
}

// Login-time authorization only (sendOTP / verifyOTP in lib/otp.ts). Checks
// the static ADMIN_EMAILS allowlist first (no DB call, same as before), then
// falls back to an ACTIVE row in team_members so invited-and-accepted
// teammates can sign in too. Every accepted teammate gets role 'ADMIN' -
// the app's auth model (see middleware.ts) is currently binary, admin or
// not, so the OWNER/ADMIN/MANAGER/VIEWER labels on team_members are stored
// for future use but not yet enforced as separate permission tiers.
export async function getAdminIdentityForEmail(email: string): Promise<WebsiteAdminIdentity | null> {
  const staticAdmin = getWebsiteAdminIdentity(email);
  if (staticAdmin) return staticAdmin;

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const member = await prisma.teamMember.findUnique({ where: { email: normalizedEmail } });
    if (!member || member.status !== 'ACTIVE') return null;

    return {
      id: `team-member-${member.id}`,
      email: normalizedEmail,
      name: member.name,
      role: 'ADMIN',
      status: 'ACTIVE',
      hasAffiliate: false,
    };
  } catch (error) {
    console.error('team_member_lookup_failed', error instanceof Error ? error.message : error);
    return null;
  }
}

export function getWebsiteAdminFromHeaders(headers: Pick<Headers, 'get'>) {
  const id = headers.get('x-user-id');
  const role = headers.get('x-user-role');
  return id && role === 'ADMIN' ? { id, role: 'ADMIN' as const } : null;
}

// Verifies an admin API request and returns the caller's identity, or null.
//
// Admin sign-in is OTP based, and the signed-in caller may be the owner
// (ADMIN_EMAILS) or an invited-and-accepted team_members row - neither has a
// row in the `users` table, so route handlers must not look the caller up
// with prisma.user.findUnique(...) (that always returns null and makes every
// such route reject valid requests with 401/403). Instead this trusts the
// verified session headers the middleware sets after checking the JWT
// (middleware only forwards them once jwtVerify succeeds, so a caller cannot
// forge them without a validly-signed token), the same way /api/admin/team
// and /api/admin/website-referrals already do. It intentionally does not
// re-derive identity from the static ADMIN_EMAILS list here - that would
// incorrectly reject invited team members, whose access lives in
// team_members rather than that env var.
export function verifyWebsiteAdmin(headers: Pick<Headers, 'get'>): WebsiteAdminIdentity | null {
  try {
    const session = getWebsiteAdminFromHeaders(headers);
    if (!session) return null;

    const email = headers.get('x-user-email');
    if (!email) return null;

    const name = headers.get('x-user-name');
    return {
      id: session.id,
      email: email.trim().toLowerCase(),
      name: name && name.trim() ? name.trim() : 'VÉLOURA Beauty on Demand Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      hasAffiliate: false,
    };
  } catch (_e) {
    return null;
  }
}
