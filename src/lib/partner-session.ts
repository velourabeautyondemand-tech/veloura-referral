import type { NextRequest } from 'next/server';
import { prisma } from './prisma';

// Loads the signed-in partner (middleware forwards x-user-id only after the
// JWT is verified). Returns null unless the user is an ACTIVE affiliate.
export async function getSignedInPartner(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { affiliate: true },
  });
  if (!user || user.role !== 'AFFILIATE' || user.status !== 'ACTIVE' || !user.affiliate) return null;
  return { user, affiliate: user.affiliate };
}
