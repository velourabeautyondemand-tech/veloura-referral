-- Adds the team_members table (and its two enums) used by the admin "Team" invite
-- flow (src/app/admin/team/page.tsx, src/app/api/admin/team/route.ts). This table
-- has no foreign key to users/affiliates (userId is a plain nullable string), so
-- this migration is fully additive and does not touch any existing table.

BEGIN;

DO $$ BEGIN
  CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'VIEWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TeamMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'DEACTIVATED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "team_members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'VIEWER',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "invited_by" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "TeamMemberStatus" NOT NULL DEFAULT 'PENDING',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_members_email_key" ON "team_members"("email");

COMMIT;
