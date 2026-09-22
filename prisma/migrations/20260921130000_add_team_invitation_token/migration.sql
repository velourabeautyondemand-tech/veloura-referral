-- Adds the invitation_token / invitation_token_expires_at columns Prisma's
-- TeamMember.invitationToken / invitationTokenExpiresAt fields map to, so
-- POST/PUT /api/admin/team can issue and validate secure invite links
-- (see src/app/api/team-invite/accept/route.ts). Additive and idempotent:
-- nothing here touches existing team_members rows.

ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "invitation_token" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "invitation_token_expires_at" TIMESTAMP(3);

DO $$ BEGIN
  CREATE UNIQUE INDEX "team_members_invitation_token_key" ON "team_members"("invitation_token");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;
