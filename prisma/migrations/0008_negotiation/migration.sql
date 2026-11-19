-- 0008_negotiation
-- negotiation settings (C6), requests, threads (H9), offers (H10), price locks (H11), moderation (M8)
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0008_negotiation.sql

-- ======================================================================= part 0: hand-written (before tables)
CREATE SEQUENCE "price_request_number_seq" START 10001;

-- ======================================================================= part 1: tables
CREATE TYPE "PriceRequestType" AS ENUM ('PRODUCT', 'OPEN');
CREATE TYPE "PriceRequestStatus" AS ENUM ('OPEN', 'HAS_OFFERS', 'ACCEPTED', 'CONVERTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RecipientStatus" AS ENUM ('SENT', 'SEEN', 'RESPONDED', 'DECLINED', 'IGNORED');
CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CLOSED');
CREATE TYPE "OfferAuthor" AS ENUM ('VENDOR', 'CUSTOMER');
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'WITHDRAWN');
CREATE TYPE "PriceLockStatus" AS ENUM ('ACTIVE', 'IN_CHECKOUT', 'USED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "ModerationActorType" AS ENUM ('CUSTOMER', 'VENDOR');

CREATE TABLE "negotiation_settings" (
    "product_id" UUID NOT NULL,
    "allow_bargain" BOOLEAN NOT NULL DEFAULT false,
    "max_rounds" INTEGER NOT NULL DEFAULT 3,
    "response_window_hours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "negotiation_settings_pkey" PRIMARY KEY ("product_id")
);

CREATE TABLE "variant_negotiation_settings" (
    "variant_id" UUID NOT NULL,
    "floor_price" INTEGER NOT NULL,
    "auto_accept_price" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "variant_negotiation_settings_pkey" PRIMARY KEY ("variant_id")
);

CREATE TABLE "price_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL DEFAULT ('PR-'::text || nextval('price_request_number_seq'::regclass)),
    "customer_id" UUID NOT NULL,
    "type" "PriceRequestType" NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "category_id" UUID NOT NULL,
    "title_ar" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "qty" INTEGER NOT NULL,
    "target_price" INTEGER NOT NULL,
    "city_id" UUID NOT NULL,
    "status" "PriceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_offer_id" UUID,
    "broadcast_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "hidden_at" TIMESTAMPTZ(3),
    "hidden_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_request_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "vendor_id" UUID,
    "status" "RecipientStatus" NOT NULL DEFAULT 'SENT',
    "seen_at" TIMESTAMPTZ(3),
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_request_recipients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "negotiation_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "vendor_id" UUID,
    "product_id" UUID,
    "variant_id" UUID,
    "vendor_rounds" INTEGER NOT NULL DEFAULT 0,
    "customer_rounds" INTEGER NOT NULL DEFAULT 0,
    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "last_offer_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "negotiation_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "vendor_id" UUID,
    "product_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "parent_offer_id" UUID,
    "author" "OfferAuthor" NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "eta_days" INTEGER NOT NULL,
    "note_raw" TEXT,
    "note_sanitized" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "visible_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_locks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "reservation_id" UUID,
    "status" "PriceLockStatus" NOT NULL DEFAULT 'ACTIVE',
    "pending_order_id" UUID,
    "used_order_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_locks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_type" "ModerationActorType" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "vendor_id" UUID,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "reasons" TEXT[] NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "moderation_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "price_requests_number_key" ON "price_requests"("number");
CREATE UNIQUE INDEX "price_requests_accepted_offer_id_key" ON "price_requests"("accepted_offer_id");
CREATE INDEX "price_requests_status_expires_at_idx" ON "price_requests"("status", "expires_at");
CREATE INDEX "price_requests_customer_id_status_idx" ON "price_requests"("customer_id", "status");
CREATE INDEX "price_requests_category_id_status_created_at_idx" ON "price_requests"("category_id", "status", "created_at" DESC);

CREATE INDEX "price_request_recipients_vendor_id_status_created_at_idx" ON "price_request_recipients"("vendor_id", "status", "created_at" DESC);
CREATE UNIQUE INDEX "price_request_recipients_request_id_vendor_id_key" ON "price_request_recipients"("request_id", "vendor_id");

CREATE INDEX "negotiation_threads_vendor_id_status_idx" ON "negotiation_threads"("vendor_id", "status");
CREATE UNIQUE INDEX "negotiation_threads_request_id_vendor_id_key" ON "negotiation_threads"("request_id", "vendor_id");

CREATE INDEX "price_offers_thread_id_created_at_idx" ON "price_offers"("thread_id", "created_at");
CREATE INDEX "price_offers_status_expires_at_idx" ON "price_offers"("status", "expires_at");

CREATE UNIQUE INDEX "price_locks_offer_id_key" ON "price_locks"("offer_id");
CREATE INDEX "price_locks_status_expires_at_idx" ON "price_locks"("status", "expires_at");
CREATE INDEX "price_locks_customer_id_status_idx" ON "price_locks"("customer_id", "status");

CREATE INDEX "moderation_flags_actor_user_id_created_at_idx" ON "moderation_flags"("actor_user_id", "created_at" DESC);
CREATE INDEX "moderation_flags_vendor_id_created_at_idx" ON "moderation_flags"("vendor_id", "created_at" DESC);

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_price_lock_id_fkey" FOREIGN KEY ("price_lock_id") REFERENCES "price_locks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_price_lock_id_fkey" FOREIGN KEY ("price_lock_id") REFERENCES "price_locks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "negotiation_settings" ADD CONSTRAINT "negotiation_settings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "variant_negotiation_settings" ADD CONSTRAINT "variant_negotiation_settings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_request_recipients" ADD CONSTRAINT "price_request_recipients_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "price_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_request_recipients" ADD CONSTRAINT "price_request_recipients_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "price_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "price_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "negotiation_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_parent_offer_id_fkey" FOREIGN KEY ("parent_offer_id") REFERENCES "price_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "price_locks" ADD CONSTRAINT "price_locks_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "price_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_locks" ADD CONSTRAINT "price_locks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_locks" ADD CONSTRAINT "price_locks_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ======================================================================= part 2: hand-written
-- ---------------------------------------------------------------- CHECKs
ALTER TABLE "negotiation_settings"
  ADD CONSTRAINT "negotiation_settings_rounds" CHECK ("max_rounds" BETWEEN 1 AND 10),
  ADD CONSTRAINT "negotiation_settings_window" CHECK ("response_window_hours" BETWEEN 1 AND 168);
-- C6 / D23: amounts in halalas. "لا يقل عن حدك الأدنى" => auto >= floor.
ALTER TABLE "variant_negotiation_settings"
  ADD CONSTRAINT "vns_floor_pos" CHECK ("floor_price" > 0),
  ADD CONSTRAINT "vns_auto_ge_floor" CHECK ("auto_accept_price" IS NULL OR "auto_accept_price" >= "floor_price");
ALTER TABLE "price_requests"
  ADD CONSTRAINT "price_requests_qty_pos" CHECK ("qty" > 0),
  ADD CONSTRAINT "price_requests_target_pos" CHECK ("target_price" > 0),
  ADD CONSTRAINT "price_requests_product_type" CHECK (("type" = 'PRODUCT') = ("product_id" IS NOT NULL)),
  ADD CONSTRAINT "price_requests_expiry" CHECK ("expires_at" > "created_at");
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_rounds" CHECK ("vendor_rounds" >= 0 AND "customer_rounds" >= 0 AND "version" >= 0);
ALTER TABLE "price_offers"
  ADD CONSTRAINT "price_offers_qty_pos" CHECK ("qty" > 0),
  ADD CONSTRAINT "price_offers_price_pos" CHECK ("unit_price" > 0),
  ADD CONSTRAINT "price_offers_shipping" CHECK ("shipping_fee" >= 0 AND "eta_days" >= 0),
  ADD CONSTRAINT "price_offers_round" CHECK ("round" >= 1);
ALTER TABLE "price_locks"
  ADD CONSTRAINT "price_locks_amounts" CHECK ("unit_price" > 0 AND "qty" > 0 AND "shipping_fee" >= 0);

-- H9/H10: one PENDING offer per thread, one ACCEPTED offer per request.
CREATE UNIQUE INDEX "price_offers_one_pending_per_thread" ON "price_offers" ("thread_id") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "price_offers_one_accepted_per_request" ON "price_offers" ("request_id") WHERE "status" = 'ACCEPTED';
-- M9 / D22: one open request per customer per product.
CREATE UNIQUE INDEX "price_requests_one_open_per_product" ON "price_requests" ("customer_id", "product_id")
  WHERE "status" IN ('OPEN', 'HAS_OFFERS') AND "product_id" IS NOT NULL;
-- vendor_id NULL = the platform (D6): unique(request_id, vendor_id) does not cover NULLs.
CREATE UNIQUE INDEX "price_request_recipients_platform_once" ON "price_request_recipients" ("request_id") WHERE "vendor_id" IS NULL;
CREATE UNIQUE INDEX "negotiation_threads_platform_once" ON "negotiation_threads" ("request_id") WHERE "vendor_id" IS NULL;

-- ---------------------------------------------------------------- RLS (sealed offers, P1-00 §3)
SELECT app.secure_table('negotiation_settings');
SELECT app.secure_table('variant_negotiation_settings');
SELECT app.secure_table('price_requests');
SELECT app.secure_table('price_request_recipients');
SELECT app.secure_table('negotiation_threads');
SELECT app.secure_table('price_offers');
SELECT app.secure_table('price_locks');
SELECT app.secure_table('moderation_flags');

CREATE POLICY ns_public_read ON "negotiation_settings" FOR SELECT USING (app.product_is_public("product_id"));
CREATE POLICY ns_owner_rw ON "negotiation_settings" FOR ALL USING (app.owns_product("product_id")) WITH CHECK (app.owns_product("product_id"));

-- SECRET thresholds: owning vendor only. Deliberately NO policy for customer/public.
CREATE POLICY vns_owner_rw ON "variant_negotiation_settings" FOR ALL
  USING (EXISTS (SELECT 1 FROM "product_variants" v WHERE v."id" = "variant_negotiation_settings"."variant_id" AND app.owns_product(v."product_id")))
  WITH CHECK (EXISTS (SELECT 1 FROM "product_variants" v WHERE v."id" = "variant_negotiation_settings"."variant_id" AND app.owns_product(v."product_id")));

CREATE POLICY pr_customer_own ON "price_requests" FOR ALL
  USING (app.is_customer() AND "customer_id" = app.user_id())
  WITH CHECK (app.is_customer() AND "customer_id" = app.user_id());
CREATE POLICY pr_vendor_recipient_read ON "price_requests" FOR SELECT
  USING (app.is_vendor() AND "hidden_at" IS NULL AND EXISTS (
    SELECT 1 FROM "price_request_recipients" r WHERE r."request_id" = "price_requests"."id" AND r."vendor_id" = app.vendor_id()));

CREATE POLICY prr_vendor_own ON "price_request_recipients" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY prr_vendor_own_upd ON "price_request_recipients" FOR UPDATE
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id()) WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());

CREATE POLICY nt_vendor_own ON "negotiation_threads" FOR ALL
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND EXISTS (
    SELECT 1 FROM "price_request_recipients" r WHERE r."request_id" = "negotiation_threads"."request_id" AND r."vendor_id" = app.vendor_id()));
CREATE POLICY nt_customer_read ON "negotiation_threads" FOR SELECT
  USING (app.is_customer() AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "negotiation_threads"."request_id" AND pr."customer_id" = app.user_id()));
CREATE POLICY nt_customer_upd ON "negotiation_threads" FOR UPDATE
  USING (app.is_customer() AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "negotiation_threads"."request_id" AND pr."customer_id" = app.user_id()));

CREATE POLICY po_vendor_own ON "price_offers" FOR ALL
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND "is_auto" = false AND EXISTS (
    SELECT 1 FROM "negotiation_threads" t WHERE t."id" = "price_offers"."thread_id" AND t."vendor_id" = app.vendor_id()));
-- D22: an auto-accept stays invisible to the customer until visible_at (random 2–10 min delay).
CREATE POLICY po_customer_read ON "price_offers" FOR SELECT
  USING (app.is_customer() AND ("visible_at" IS NULL OR "visible_at" <= now()) AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "price_offers"."request_id" AND pr."customer_id" = app.user_id()));
CREATE POLICY po_customer_counter ON "price_offers" FOR INSERT
  WITH CHECK (app.is_customer() AND "author" = 'CUSTOMER' AND "is_auto" = false AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "price_offers"."request_id" AND pr."customer_id" = app.user_id()));
CREATE POLICY po_customer_upd ON "price_offers" FOR UPDATE
  USING (app.is_customer() AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "price_offers"."request_id" AND pr."customer_id" = app.user_id()));

CREATE POLICY pl_customer_read ON "price_locks" FOR SELECT USING (app.is_customer() AND "customer_id" = app.user_id());
CREATE POLICY pl_vendor_read ON "price_locks" FOR SELECT
  USING (app.is_vendor() AND EXISTS (SELECT 1 FROM "price_offers" o WHERE o."id" = "price_locks"."offer_id" AND o."vendor_id" = app.vendor_id()));

-- moderation_flags: staff/system only (noteRaw review, D22 suspension counting).
