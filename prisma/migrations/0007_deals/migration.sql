-- 0007_deals
-- deals, deal variants + exclusion constraint (H6), redemptions (H7)
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0007_deals.sql

-- ======================================================================= part 1: tables
CREATE TYPE "DealType" AS ENUM ('FLASH', 'DAILY', 'WEEKLY', 'CLEARANCE', 'BUNDLE');
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'LIVE', 'ENDED', 'REJECTED');
CREATE TYPE "DealRedemptionStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

CREATE TABLE "deals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID,
    "product_id" UUID,
    "bundle_id" UUID,
    "type" "DealType" NOT NULL,
    "deal_price" INTEGER,
    "discount_bps" INTEGER,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "stock_limit" INTEGER,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "per_customer_limit" INTEGER,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "badge_ar" TEXT,
    "badge_en" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'DRAFT',
    "reject_reason" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "discount_license_number" TEXT,
    "discount_license_from" TIMESTAMPTZ(3),
    "discount_license_to" TIMESTAMPTZ(3),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deal_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "is_blocking" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "deal_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "qty" INTEGER NOT NULL,
    "status" "DealRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deals_status_starts_at_ends_at_idx" ON "deals"("status", "starts_at", "ends_at");
CREATE INDEX "deals_vendor_id_status_idx" ON "deals"("vendor_id", "status");
CREATE INDEX "deals_is_pinned_priority_idx" ON "deals"("is_pinned", "priority");

CREATE INDEX "deal_variants_variant_id_idx" ON "deal_variants"("variant_id");
CREATE UNIQUE INDEX "deal_variants_deal_id_variant_id_key" ON "deal_variants"("deal_id", "variant_id");

CREATE INDEX "deal_redemptions_deal_id_user_id_status_idx" ON "deal_redemptions"("deal_id", "user_id", "status");

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deal_variants" ADD CONSTRAINT "deal_variants_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_variants" ADD CONSTRAINT "deal_variants_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_redemptions" ADD CONSTRAINT "deal_redemptions_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_redemptions" ADD CONSTRAINT "deal_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_redemptions" ADD CONSTRAINT "deal_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ======================================================================= part 2: hand-written
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "deals"
  ADD CONSTRAINT "deals_one_target" CHECK (num_nonnulls("product_id", "bundle_id") = 1),             -- M12
  ADD CONSTRAINT "deals_one_price" CHECK (num_nonnulls("deal_price", "discount_bps") = 1),            -- M13
  ADD CONSTRAINT "deals_discount_bps" CHECK ("discount_bps" IS NULL OR "discount_bps" BETWEEN 1 AND 9999),
  ADD CONSTRAINT "deals_price_pos" CHECK ("deal_price" IS NULL OR "deal_price" > 0),
  ADD CONSTRAINT "deals_window" CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "deals_counters" CHECK ("sold_count" >= 0 AND "reserved_count" >= 0
    AND ("stock_limit" IS NULL OR ("stock_limit" > 0 AND "sold_count" + "reserved_count" <= "stock_limit"))),
  ADD CONSTRAINT "deals_per_customer" CHECK ("per_customer_limit" IS NULL OR "per_customer_limit" > 0),
  ADD CONSTRAINT "deals_bundle_platform_only" CHECK ("bundle_id" IS NULL OR "vendor_id" IS NULL),
  ADD CONSTRAINT "deals_license_window" CHECK ("discount_license_to" IS NULL OR "discount_license_from" IS NULL OR "discount_license_to" > "discount_license_from");
ALTER TABLE "deal_variants" ADD CONSTRAINT "deal_variants_window" CHECK ("ends_at" > "starts_at");
ALTER TABLE "deal_redemptions" ADD CONSTRAINT "deal_redemptions_qty_pos" CHECK ("qty" > 0);

-- H6: one blocking deal per variant per time range.
ALTER TABLE "deal_variants" ADD CONSTRAINT "deal_variants_no_overlap"
  EXCLUDE USING gist ("variant_id" WITH =, tstzrange("starts_at", "ends_at") WITH &&) WHERE ("is_blocking");

-- Vendors draft/submit; approval, LIVE/ENDED and counters are staff/system (6.7).
CREATE FUNCTION app.guard_deals() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF NEW."status" NOT IN ('DRAFT', 'PENDING')
     OR (TG_OP = 'UPDATE' AND (NEW."sold_count" IS DISTINCT FROM OLD."sold_count"
         OR NEW."reserved_count" IS DISTINCT FROM OLD."reserved_count"
         OR NEW."is_pinned" IS DISTINCT FROM OLD."is_pinned" OR NEW."priority" IS DISTINCT FROM OLD."priority"))
     OR (TG_OP = 'INSERT' AND (NEW."sold_count" <> 0 OR NEW."reserved_count" <> 0 OR NEW."is_pinned")) THEN
    RAISE EXCEPTION 'privileged deal columns can only be changed by staff' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "deals_guard" BEFORE INSERT OR UPDATE ON "deals" FOR EACH ROW EXECUTE FUNCTION app.guard_deals();

SELECT app.secure_table('deals');
SELECT app.secure_table('deal_variants', true);
SELECT app.secure_table('deal_redemptions');

CREATE POLICY deals_vendor ON "deals" FOR ALL
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND "bundle_id" IS NULL AND app.owns_product("product_id"));
-- "active" is computed in the query (now() BETWEEN starts_at AND ends_at), not trusted from cron (H7).
CREATE POLICY deals_public ON "deals" FOR SELECT USING (app.is_reader() AND "status" IN ('APPROVED', 'LIVE'));

CREATE POLICY deal_variants_vendor ON "deal_variants" FOR ALL
  USING (EXISTS (SELECT 1 FROM "deals" d WHERE d."id" = "deal_variants"."deal_id" AND app.is_vendor() AND d."vendor_id" = app.vendor_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "deals" d WHERE d."id" = "deal_variants"."deal_id" AND app.is_vendor() AND d."vendor_id" = app.vendor_id()));
CREATE POLICY deal_variants_public ON "deal_variants" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "deals" d WHERE d."id" = "deal_variants"."deal_id" AND app.is_reader() AND d."status" IN ('APPROVED', 'LIVE')));

CREATE POLICY deal_redemptions_own ON "deal_redemptions" FOR SELECT USING (app.is_customer() AND "user_id" = app.user_id());
