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
