import { createHash } from 'crypto';

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

export function getWebsiteAdminFromHeaders(headers: Pick<Headers, 'get'>) {
  const id = headers.get('x-user-id');
  const role = headers.get('x-user-role');
  return id && role === 'ADMIN' ? { id, role: 'ADMIN' as const } : null;
}

// Verifies an admin API request and returns the caller's identity, or null.
//
// Admin sign-in is OTP + ADMIN_EMAILS based: there is no row for the admin
// in the `users` table, so route handlers must not look the caller up with
// prisma.user.findUnique(...) (that always returns null for the admin and
// makes every such route reject valid requests with 401/403). Instead this
// re-derives the identity from the verified session headers the middleware
// sets after checking the JWT, the same way /api/admin/team and
// /api/admin/website-referrals already do.
export function verifyWebsiteAdmin(headers: Pick<Headers, 'get'>): WebsiteAdminIdentity | null {
  try {
    const session = getWebsiteAdminFromHeaders(headers);
    const email = headers.get('x-user-email');
    const admin = email ? getWebsiteAdminIdentity(email) : null;
    return session && admin && session.id === admin.id ? admin : null;
  } catch (_e) {
    return null;
  }
}
