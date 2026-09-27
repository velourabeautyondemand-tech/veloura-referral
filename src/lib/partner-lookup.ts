import { prisma } from './prisma';

// Looks up an ACTIVE partner by referral code (case-insensitive match on the
// stored code). Returns only what attribution needs.
export async function findActivePartnerByCode(code: string): Promise<{ name: string; email: string } | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const affiliate = await prisma.affiliate.findFirst({
    where: { referralCode: { equals: trimmed, mode: 'insensitive' } },
    include: { user: { select: { name: true, email: true, status: true } } },
  });
  if (!affiliate || !affiliate.user || affiliate.user.status !== 'ACTIVE') return null;
  return { name: affiliate.user.name, email: affiliate.user.email };
}
