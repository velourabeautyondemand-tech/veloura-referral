# Migration safety

The migration history contains two ordered migrations:

1. `20260812000000_baseline` represents the legacy Refferq schema already present in Neon.
2. `20260812010000_website_referrals_and_auth` adds the isolated website referral model and reconciles OTP/rate-limit tables with `prisma/schema.prisma`.

## Existing Neon production database

Do not execute the baseline SQL. After taking a Neon backup/branch and confirming the existing legacy tables, mark it as already applied:

```sh
npx prisma migrate resolve --applied 20260812000000_baseline
```

Then inspect migration status. Only after review should `prisma migrate deploy` apply the second migration. The second migration is transactional, contains no `DROP TABLE`, `TRUNCATE`, or `DELETE`, and preserves all existing `rate_limit_entries` rows. It aborts and rolls back when it encounters unsupported types, null key fields, or duplicates that would make Prisma's required keys unsafe.

If `_prisma_migrations` already contains a different migration history, stop and reconcile that history instead of marking this baseline.

## New empty database

Run `prisma migrate deploy`; the baseline creates the legacy schema and the second migration adds the website-referral changes.
