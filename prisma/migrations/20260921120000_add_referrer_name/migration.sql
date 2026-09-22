-- Adds an optional "referrer_name" column to website_referrals so the public
-- /refer-a-technician form (src/app/refer-a-technician/page.tsx) can capture
-- "Who referred you" as well as the referrer's email. Nullable and additive:
-- existing rows are untouched and keep working with referrer_email alone.

ALTER TABLE "website_referrals" ADD COLUMN IF NOT EXISTS "referrer_name" TEXT;
