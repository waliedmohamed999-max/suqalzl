-- EXPECTED output of:
--   prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script
-- (shadow database from SHADOW_DATABASE_URL, prisma.config.ts). Compared by CI (devops P1-03b, Diff 3).
--
-- WRITTEN BY HAND (backend-engineer, P1-01d): the Prisma schema-engine binary cannot be downloaded in
-- the build sandbox (binaries.prisma.sh -> 403), so this file was NOT generated. It lists what Prisma
-- would do to make the migrated database match schema.prisma: drop the 12 indexes that exist only in
-- prisma/sql/ (partial / GIN / partial-unique — not expressible in the Prisma schema). Everything else
-- hand-written (CHECK, EXCLUDE, triggers, functions, RLS policies, sequences, search_vector column
-- declared as Unsupported) is not diffed by Prisma.
-- Order: by index name. If the first real run differs ONLY in order or blank lines/comments, replace
-- this file with the real output; if it lists anything else, that is drift -> tell backend-engineer.
-- Source of each index: prisma/sql/<migration>.sql (NEVER apply this script).

-- DropIndex
DROP INDEX "jobs_pending_run_at_idx";

-- DropIndex
DROP INDEX "negotiation_threads_platform_once";

-- DropIndex
DROP INDEX "orders_pending_payment_idx";

-- DropIndex
DROP INDEX "otp_challenges_open_idx";

-- DropIndex
DROP INDEX "payment_transactions_one_capture";

-- DropIndex
DROP INDEX "price_offers_one_accepted_per_request";

-- DropIndex
DROP INDEX "price_offers_one_pending_per_thread";

-- DropIndex
DROP INDEX "price_request_recipients_platform_once";

-- DropIndex
DROP INDEX "price_requests_one_open_per_product";

-- DropIndex
DROP INDEX "products_search_vector_idx";

-- DropIndex
DROP INDEX "stock_reservations_active_expires_idx";

-- DropIndex
DROP INDEX "webhook_events_unprocessed_idx";

