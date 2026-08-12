import { createHash } from 'crypto';

export type WebsiteAdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
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
    name: 'VÉLOURA Admin',
    role: 'ADMIN',
    hasAffiliate: false,
  };
}

export function getWebsiteAdminFromHeaders(headers: Pick<Headers, 'get'>) {
  const id = headers.get('x-user-id');
  const role = headers.get('x-user-role');
  return id && role === 'ADMIN' ? { id, role: 'ADMIN' as const } : null;
}
