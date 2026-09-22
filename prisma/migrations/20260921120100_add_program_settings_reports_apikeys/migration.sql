-- The "baseline" migration (20260812000000_baseline) is recorded as applied in
-- _prisma_migrations, but on this database it never actually created most of
-- its tables (only otps, rate_limit_entries and referrals exist from it). This
-- migration is a targeted catch-up: it creates just the tables backing the
-- admin "Configure" pages (Program Settings, Reports, API Keys, API Analytics),
-- which currently 500 because program_settings / commission_rules /
-- scheduled_reports / saved_reports / api_keys / api_usage_logs don't exist.
--
-- Fully additive and idempotent (safe to run more than once): every
-- statement guards against the object already existing, and nothing here
-- touches otps, rate_limit_entries, referrals, team_members or
-- website_referrals, which already hold live data.

DO $$ BEGIN
  CREATE TYPE "CommissionRuleType" AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "program_settings" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "program_name" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "blocked_countries" JSONB NOT NULL DEFAULT '[]',
    "portal_subdomain" TEXT NOT NULL,
    "terms_of_service" TEXT,
    "minimum_payout_threshold" INTEGER NOT NULL DEFAULT 0,
    "payout_term" TEXT NOT NULL DEFAULT 'NET-15',
    "payout_methods" JSONB NOT NULL DEFAULT '["PAYPAL"]',
    "brand_background_color" TEXT NOT NULL DEFAULT '#000000',
    "brand_button_color" TEXT NOT NULL DEFAULT '#000000',
    "brand_text_color" TEXT NOT NULL DEFAULT '#ffffff',
    "company_logo" TEXT,
    "favicon" TEXT,
    "cookie_duration" INTEGER NOT NULL DEFAULT 30,
    "url_parameters" JSONB NOT NULL DEFAULT '[]',
    "hide_customer_emails" BOOLEAN NOT NULL DEFAULT true,
    "disable_personalized_links" BOOLEAN NOT NULL DEFAULT false,
    "block_keywords" JSONB NOT NULL DEFAULT '[]',
    "block_social_media_ads" JSONB NOT NULL DEFAULT '[]',
    "allow_manual_lead_submission" BOOLEAN NOT NULL DEFAULT false,
    "program_wide_coupon_code" TEXT,
    "hide_partner_links" BOOLEAN NOT NULL DEFAULT false,
    "require_business_email" BOOLEAN NOT NULL DEFAULT false,
    "enable_postbacks" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_payouts" BOOLEAN NOT NULL DEFAULT false,
    "payout_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "commission_hold_days" INTEGER NOT NULL DEFAULT 30,
    "min_payout_cents" INTEGER NOT NULL DEFAULT 100000,
    "company_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "program_settings_program_id_key" ON "program_settings"("program_id");

CREATE TABLE IF NOT EXISTS "commission_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommissionRuleType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "scheduled_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "frequency" "ReportFrequency" NOT NULL DEFAULT 'WEEKLY',
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "format" TEXT NOT NULL DEFAULT 'csv',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "saved_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "report_type" TEXT NOT NULL,
    "columns" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "sort_by" TEXT,
    "sort_order" TEXT DEFAULT 'desc',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT,
    "key_hash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '["read"]',
    "rate_limit" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");

CREATE TABLE IF NOT EXISTS "api_usage_logs" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_ms" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_usage_logs_api_key_id_idx" ON "api_usage_logs"("api_key_id");
CREATE INDEX IF NOT EXISTS "api_usage_logs_created_at_idx" ON "api_usage_logs"("created_at");
CREATE INDEX IF NOT EXISTS "api_usage_logs_endpoint_idx" ON "api_usage_logs"("endpoint");

DO $$ BEGIN
  ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Seed the single program_settings row with VÉLOURA's real info instead of
-- the template's placeholder defaults (the API auto-creates a row with
-- productName 'BsBot' / websiteUrl 'https://kyns.com' / currency 'INR' the
-- first time GET /api/admin/settings runs against an empty table).
INSERT INTO "program_settings" (
  "id", "program_id", "product_name", "program_name", "website_url", "currency", "portal_subdomain", "updated_at"
)
SELECT
  'veloura-program-settings',
  'prg_veloura',
  'VÉLOURA Beauty on Demand',
  'VÉLOURA Technician Referral Program',
  'https://velourabeautyondemand.com',
  'USD',
  'veloura-referral',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "program_settings");
