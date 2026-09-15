import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { getWebsiteAdminIdentity } from '../src/lib/website-admin-auth';

process.env.ADMIN_EMAILS = 'owner@example.com';
const admin = getWebsiteAdminIdentity('owner@example.com')!;
const rows: any[] = [];
let reads = 0;
(globalThis as any).prisma = {
  user: { findUnique: () => { throw new Error('Website admin must not need a legacy user'); } },
  teamMember: {
    findMany: async () => { reads++; return rows; },
    findUnique: async ({ where }: any) => rows.find(row => row.email === where.email) || null,
    create: async ({ data }: any) => { const row = { id: 'member-1', ...data }; rows.push(row); return row; },
    update: async ({ data }: any) => Object.assign(rows[0], data),
    delete: async () => rows.splice(0, 1),
  },
};

function request(method: string, body?: unknown, overrides: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/admin/team?id=member-1', {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': admin.id, 'x-user-role': 'ADMIN', 'x-user-email': admin.email, ...overrides },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('team flow uses the verified website admin and validates pending invitations', async () => {
  const { GET, POST, PUT, DELETE } = await import('../src/app/api/admin/team/route');
  for (const headers of [
    { 'x-user-id': '' },
    { 'x-user-role': 'AFFILIATE' },
    { 'x-user-email': 'unlisted@example.com' },
    { 'x-user-id': 'different-admin' },
  ] as Record<string, string>[]) {
    assert.equal((await GET(request('GET', undefined, headers))).status, 401);
    assert.equal((await POST(request('POST', { name: 'Test', email: 'test@example.com' }, headers))).status, 401);
    assert.equal((await PUT(request('PUT', { id: 'member-1' }, headers))).status, 401);
    assert.equal((await DELETE(request('DELETE', undefined, headers))).status, 401);
  }
  assert.equal(reads, 0);
  assert.equal(rows.length, 0);
  assert.equal((await GET(request('GET'))).status, 200);
  for (const body of [
    { name: ' ', email: 'test@example.com' },
    { name: 'Test', email: 'invalid' },
    { name: 'Test', email: 'test@example.com', role: 'INVALID' },
  ]) assert.equal((await POST(request('POST', body))).status, 400);
  const saved = await POST(request('POST', { name: ' Test ', email: ' TEST@example.com ', role: 'VIEWER' }));
  assert.equal(saved.status, 200);
  assert.equal(rows[0].email, 'test@example.com');
  assert.equal(rows[0].name, 'Test');
  assert.equal(rows[0].invitedBy, admin.id);
  assert.equal(rows[0].status, 'PENDING');
  assert.equal((await POST(request('POST', { name: 'Test', email: 'TEST@example.com' }))).status, 400);
  assert.equal((await PUT(request('PUT', { id: 'member-1', status: 'INVALID' }))).status, 400);
  assert.equal((await PUT(request('PUT', { id: 'member-1', status: 'ACTIVE', invitedBy: 'forged' }))).status, 200);
  assert.equal(rows[0].status, 'ACTIVE');
  assert.equal(rows[0].invitedBy, admin.id);
  assert.equal((await DELETE(request('DELETE'))).status, 200);
  assert.equal(rows.length, 0);
});
