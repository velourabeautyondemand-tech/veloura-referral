-- Schema-derived migration for website technician referrals and OTP/rate-limit auth support.
-- Existing databases must be reviewed before `prisma migrate deploy`; this migration is not deployed here.

BEGIN;

DO $$ BEGIN
  CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'EARNED', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WebsiteReferralStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  IF (SELECT array_agg(enumlabel ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = '"ReferralRewardStatus"'::regtype)
      <> ARRAY['PENDING', 'EARNED', 'PAID'] THEN
    RAISE EXCEPTION 'Existing ReferralRewardStatus enum is incompatible; migration stopped without changing data';
  END IF;
  IF (SELECT array_agg(enumlabel ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = '"WebsiteReferralStatus"'::regtype)
      <> ARRAY['PENDING', 'APPROVED', 'REJECTED'] THEN
    RAISE EXCEPTION 'Existing WebsiteReferralStatus enum is incompatible; migration stopped without changing data';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "otps" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "is_used" BOOLEAN NOT NULL DEFAULT false,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

DO $$
DECLARE
  matching_columns INTEGER;
  primary_key_columns NAME[];
BEGIN
  SELECT count(*) INTO matching_columns
  FROM pg_attribute
  WHERE attrelid = to_regclass('public.otps')
    AND attnum > 0
    AND NOT attisdropped
    AND (
      (attname = 'id' AND format_type(atttypid, atttypmod) = 'text' AND attnotnull) OR
      (attname = 'email' AND format_type(atttypid, atttypmod) = 'text' AND attnotnull) OR
      (attname = 'code' AND format_type(atttypid, atttypmod) = 'text' AND attnotnull) OR
      (attname = 'expires_at' AND format_type(atttypid, atttypmod) = 'timestamp(3) without time zone' AND attnotnull) OR
      (attname = 'is_used' AND format_type(atttypid, atttypmod) = 'boolean' AND attnotnull) OR
      (attname = 'attempts' AND format_type(atttypid, atttypmod) = 'integer' AND attnotnull) OR
      (attname = 'created_at' AND format_type(atttypid, atttypmod) = 'timestamp(3) without time zone' AND attnotnull)
    );

  IF matching_columns <> 7 THEN
    RAISE EXCEPTION 'Existing otps does not match prisma/schema.prisma; migration stopped without dropping or rewriting the table';
  END IF;

  SELECT array_agg(a.attname ORDER BY keys.ordinality) INTO primary_key_columns
  FROM pg_index i
  CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ordinality)
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = keys.attnum
  WHERE i.indrelid = to_regclass('public.otps') AND i.indisprimary;

  IF primary_key_columns IS NULL THEN
    IF EXISTS (SELECT 1 FROM "otps" GROUP BY "id" HAVING count(*) > 1) THEN
      RAISE EXCEPTION 'otps has duplicate ids; migration stopped without deleting data';
    END IF;
    ALTER TABLE "otps" ADD CONSTRAINT "otps_pkey" PRIMARY KEY ("id");
  ELSIF primary_key_columns <> ARRAY['id']::name[] THEN
    RAISE EXCEPTION 'otps primary key is not id; migration stopped without deleting data';
  END IF;

  ALTER TABLE "otps" ALTER COLUMN "is_used" SET DEFAULT false;
  ALTER TABLE "otps" ALTER COLUMN "attempts" SET DEFAULT 0;
  ALTER TABLE "otps" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
END $$;

CREATE INDEX IF NOT EXISTS "otps_email_idx" ON "otps"("email");
CREATE INDEX IF NOT EXISTS "otps_code_idx" ON "otps"("code");

CREATE TABLE IF NOT EXISTS "rate_limit_entries" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("id")
);

-- Neon already contains a manually created version of this table. Reconcile only
-- the schema fields Prisma requires, preserving every row and never replacing it.
DO $$
DECLARE
  column_format TEXT;
  primary_key_columns NAME[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'id' AND attnum > 0 AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'identifier' AND attnum > 0 AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'window_start' AND attnum > 0 AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Existing rate_limit_entries is missing id, identifier, or window_start; migration stopped without deleting data';
  END IF;

  -- The production logs show that the manual table used a non-text id. Prisma
  -- supplies cuid text values, so convert UUID/varchar ids in place and preserve values.
  SELECT format_type(atttypid, atttypmod) INTO column_format
  FROM pg_attribute
  WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'id' AND attnum > 0 AND NOT attisdropped;
  IF column_format <> 'text' THEN
    IF column_format <> 'uuid' AND column_format NOT LIKE 'character varying%' AND column_format NOT LIKE 'character%' THEN
      RAISE EXCEPTION 'Unsupported rate_limit_entries.id type: %; migration stopped without deleting data', column_format;
    END IF;
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "id" DROP DEFAULT;
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
  END IF;

  SELECT format_type(atttypid, atttypmod) INTO column_format
  FROM pg_attribute
  WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'identifier' AND attnum > 0 AND NOT attisdropped;
  IF column_format <> 'text' THEN
    IF column_format NOT LIKE 'character varying%' AND column_format NOT LIKE 'character%' THEN
      RAISE EXCEPTION 'Unsupported rate_limit_entries.identifier type: %; migration stopped without deleting data', column_format;
    END IF;
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "identifier" TYPE TEXT USING "identifier"::text;
  END IF;

  ALTER TABLE "rate_limit_entries" ADD COLUMN IF NOT EXISTS "endpoint" TEXT;
  ALTER TABLE "rate_limit_entries" ADD COLUMN IF NOT EXISTS "request_count" INTEGER DEFAULT 0;
  ALTER TABLE "rate_limit_entries" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

  SELECT format_type(atttypid, atttypmod) INTO column_format
  FROM pg_attribute
  WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'endpoint' AND attnum > 0 AND NOT attisdropped;
  IF column_format <> 'text' THEN
    IF column_format NOT LIKE 'character varying%' AND column_format NOT LIKE 'character%' THEN
      RAISE EXCEPTION 'Unsupported rate_limit_entries.endpoint type: %; migration stopped without deleting data', column_format;
    END IF;
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "endpoint" TYPE TEXT USING "endpoint"::text;
  END IF;

  SELECT format_type(atttypid, atttypmod) INTO column_format
  FROM pg_attribute
  WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'window_start' AND attnum > 0 AND NOT attisdropped;
  IF column_format LIKE 'timestamp%with time zone' THEN
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "window_start" TYPE TIMESTAMP(3) USING "window_start" AT TIME ZONE 'UTC';
  ELSIF column_format LIKE 'timestamp%without time zone' AND column_format <> 'timestamp(3) without time zone' THEN
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "window_start" TYPE TIMESTAMP(3) USING "window_start"::timestamp(3);
  ELSIF column_format NOT LIKE 'timestamp%without time zone' THEN
    RAISE EXCEPTION 'Unsupported rate_limit_entries.window_start type: %; migration stopped without deleting data', column_format;
  END IF;

  SELECT format_type(atttypid, atttypmod) INTO column_format
  FROM pg_attribute
  WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'request_count' AND attnum > 0 AND NOT attisdropped;
  IF column_format <> 'integer' THEN
    IF column_format NOT IN ('smallint', 'bigint') THEN
      RAISE EXCEPTION 'Unsupported rate_limit_entries.request_count type: %; migration stopped without deleting data', column_format;
    END IF;
    IF EXISTS (SELECT 1 FROM "rate_limit_entries" WHERE "request_count" > 2147483647 OR "request_count" < -2147483648) THEN
      RAISE EXCEPTION 'rate_limit_entries.request_count contains values outside the Prisma Int range; migration stopped without deleting data';
    END IF;
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "request_count" TYPE INTEGER USING "request_count"::integer;
  END IF;

  SELECT format_type(atttypid, atttypmod) INTO column_format
  FROM pg_attribute
  WHERE attrelid = to_regclass('public.rate_limit_entries') AND attname = 'created_at' AND attnum > 0 AND NOT attisdropped;
  IF column_format LIKE 'timestamp%with time zone' THEN
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) USING "created_at" AT TIME ZONE 'UTC';
  ELSIF column_format LIKE 'timestamp%without time zone' AND column_format <> 'timestamp(3) without time zone' THEN
    ALTER TABLE "rate_limit_entries" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) USING "created_at"::timestamp(3);
  ELSIF column_format NOT LIKE 'timestamp%without time zone' THEN
    RAISE EXCEPTION 'Unsupported rate_limit_entries.created_at type: %; migration stopped without deleting data', column_format;
  END IF;

  IF EXISTS (SELECT 1 FROM "rate_limit_entries" WHERE "id" IS NULL OR "identifier" IS NULL OR "window_start" IS NULL) THEN
    RAISE EXCEPTION 'rate_limit_entries has null key fields; migration stopped without deleting data';
  END IF;

  UPDATE "rate_limit_entries" SET "endpoint" = 'legacy' WHERE "endpoint" IS NULL;
  UPDATE "rate_limit_entries" SET "request_count" = 0 WHERE "request_count" IS NULL;
  UPDATE "rate_limit_entries" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;

  ALTER TABLE "rate_limit_entries" ALTER COLUMN "id" SET NOT NULL;
  ALTER TABLE "rate_limit_entries" ALTER COLUMN "identifier" SET NOT NULL;
  ALTER TABLE "rate_limit_entries" ALTER COLUMN "endpoint" SET NOT NULL;
  ALTER TABLE "rate_limit_entries" ALTER COLUMN "window_start" SET NOT NULL;
  ALTER TABLE "rate_limit_entries" ALTER COLUMN "request_count" SET DEFAULT 0;
  ALTER TABLE "rate_limit_entries" ALTER COLUMN "request_count" SET NOT NULL;
  ALTER TABLE "rate_limit_entries" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
  ALTER TABLE "rate_limit_entries" ALTER COLUMN "created_at" SET NOT NULL;

  SELECT array_agg(a.attname ORDER BY keys.ordinality) INTO primary_key_columns
  FROM pg_index i
  CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ordinality)
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = keys.attnum
  WHERE i.indrelid = to_regclass('public.rate_limit_entries') AND i.indisprimary;

  IF primary_key_columns IS NULL THEN
    IF EXISTS (SELECT 1 FROM "rate_limit_entries" GROUP BY "id" HAVING count(*) > 1) THEN
      RAISE EXCEPTION 'rate_limit_entries has duplicate ids; migration stopped without deleting data';
    END IF;
    ALTER TABLE "rate_limit_entries" ADD CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("id");
  ELSIF primary_key_columns <> ARRAY['id']::name[] THEN
    RAISE EXCEPTION 'rate_limit_entries primary key is not id; migration stopped without deleting data';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "rate_limit_entries"
    GROUP BY "identifier", "endpoint", "window_start"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'rate_limit_entries has duplicate rate-limit windows; migration stopped without deleting data';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_entries_identifier_endpoint_window_start_key"
  ON "rate_limit_entries"("identifier", "endpoint", "window_start");
CREATE INDEX IF NOT EXISTS "rate_limit_entries_identifier_idx" ON "rate_limit_entries"("identifier");

DO $$
DECLARE
  primary_key_ok BOOLEAN;
  unique_key_ok BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = to_regclass('public.rate_limit_entries')
      AND i.indisprimary
      AND (
        SELECT array_agg(a.attname ORDER BY keys.ordinality)
        FROM unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = keys.attnum
      ) = ARRAY['id']::name[]
  ) INTO primary_key_ok;

  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class index_class ON index_class.oid = i.indexrelid
    WHERE i.indrelid = to_regclass('public.rate_limit_entries')
      AND index_class.relname = 'rate_limit_entries_identifier_endpoint_window_start_key'
      AND i.indisunique
      AND (
        SELECT array_agg(a.attname ORDER BY keys.ordinality)
        FROM unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = keys.attnum
      ) = ARRAY['identifier', 'endpoint', 'window_start']::name[]
  ) INTO unique_key_ok;

  IF NOT primary_key_ok OR NOT unique_key_ok THEN
    RAISE EXCEPTION 'Existing rate_limit_entries keys do not match prisma/schema.prisma; migration stopped without dropping or rewriting the table';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "website_referrals" (
  "id" TEXT NOT NULL,
  "referrer_email" TEXT NOT NULL,
  "technician_name" TEXT NOT NULL,
  "technician_email" TEXT NOT NULL,
  "technician_phone" TEXT NOT NULL,
  "status" "WebsiteReferralStatus" NOT NULL DEFAULT 'PENDING',
  "onboarding_completed_at" TIMESTAMP(3),
  "reward_status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
  "reward_amount_cents" INTEGER NOT NULL DEFAULT 1000,
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "review_notes" TEXT,
  "earned_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "website_referrals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "website_referrals_reward_amount_check" CHECK ("reward_amount_cents" = 1000),
  CONSTRAINT "website_referrals_reward_state_check" CHECK (
    ("reward_status" = 'PENDING' AND "earned_at" IS NULL AND "paid_at" IS NULL)
    OR ("reward_status" = 'EARNED' AND "status" = 'APPROVED' AND "onboarding_completed_at" IS NOT NULL AND "earned_at" IS NOT NULL AND "paid_at" IS NULL)
    OR ("reward_status" = 'PAID' AND "status" = 'APPROVED' AND "onboarding_completed_at" IS NOT NULL AND "earned_at" IS NOT NULL AND "paid_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "website_referrals_technician_email_key" ON "website_referrals"("technician_email");
CREATE INDEX IF NOT EXISTS "website_referrals_referrer_email_idx" ON "website_referrals"("referrer_email");
CREATE INDEX IF NOT EXISTS "website_referrals_status_reward_status_idx" ON "website_referrals"("status", "reward_status");

COMMIT;
