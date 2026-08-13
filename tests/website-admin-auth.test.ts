import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getWebsiteAdminFromHeaders,
  getWebsiteAdminIdentity,
  parseWebsiteAdminEmails,
} from '../src/lib/website-admin-auth.ts';

test('configured website admin emails are normalized', () => {
  assert.deepEqual(
    [...parseWebsiteAdminEmails(' FIRST@example.com,second@example.com; THIRD@example.com ')],
    ['first@example.com', 'second@example.com', 'third@example.com']
  );
});

test('an allowlisted email receives a stable website admin identity', () => {
  const first = getWebsiteAdminIdentity(' ADMIN@example.com ', 'admin@example.com');
  const second = getWebsiteAdminIdentity('admin@example.com', 'admin@example.com');
  assert.equal(first?.role, 'ADMIN');
  assert.equal(first?.email, 'admin@example.com');
  assert.equal(first?.hasAffiliate, false);
  assert.equal(first?.id, second?.id);
});

test('an email outside the allowlist cannot request an admin OTP', () => {
  assert.equal(getWebsiteAdminIdentity('other@example.com', 'admin@example.com'), null);
});

test('admin API identity requires both signed middleware headers', () => {
  const validHeaders = new Headers({ 'x-user-id': 'website-admin-123', 'x-user-role': 'ADMIN' });
  const missingRole = new Headers({ 'x-user-id': 'website-admin-123' });
  assert.deepEqual(getWebsiteAdminFromHeaders(validHeaders), { id: 'website-admin-123', role: 'ADMIN' });
  assert.equal(getWebsiteAdminFromHeaders(missingRole), null);
});

test('empty admin configuration denies all website admin logins', () => {
  assert.equal(getWebsiteAdminIdentity('admin@example.com', ''), null);
});
