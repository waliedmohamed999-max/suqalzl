-- 0003_security_rls  (rewrite of backend.md migration 0009 on generic Postgres — T10 / C2)
--
-- Model:
--   * The app connects as suq_app (NOSUPERUSER, NOBYPASSRLS, not owner).
--   * Every request runs inside a transaction that first does
--       SELECT set_config('app.role', <ctx>, true), set_config('app.vendor_id', ..., true), set_config('app.user_id', ..., true)
--     (= SET LOCAL; reset automatically at COMMIT/ROLLBACK, safe with transaction-mode poolers).
--   * app.role in ('system','admin','vendor','customer','public'). No context => no policy matches => fail closed.
--   * This is a SECOND layer. The primary layer is the service (vendorScope) which always filters by
--     vendorId from the session. RLS catches service bugs (forgotten WHERE) and direct SQL by the app role.
--   * Limitation: anything that can run arbitrary SQL as suq_app can also call set_config(). RLS here is
--     defence against bugs, not against SQL injection with stacked statements.

CREATE SCHEMA IF NOT EXISTS app;

CREATE FUNCTION app.ctx_role() RETURNS text LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.role', true), '') $$;
CREATE FUNCTION app.vendor_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.vendor_id', true), '')::uuid $$;
CREATE FUNCTION app.user_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE FUNCTION app.is_staff() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() IN ('system', 'admin'), false) $$;
CREATE FUNCTION app.is_vendor() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() = 'vendor' AND app.vendor_id() IS NOT NULL, false) $$;
CREATE FUNCTION app.is_customer() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() = 'customer' AND app.user_id() IS NOT NULL, false) $$;

-- ---------------------------------------------------------------- grants
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO suq_app;
GRANT USAGE ON SCHEMA app TO suq_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM suq_app;
-- No DELETE / TRUNCATE for the runtime role at all (soft states instead).
GRANT SELECT, INSERT, UPDATE ON
  "users", "vendors", "categories", "products", "product_variants", "variant_negotiation_settings",
  "price_requests", "price_request_recipients", "negotiation_threads", "price_offers", "stock_reservations"
  TO suq_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO suq_app;
-- realtime_events: NO direct access; only through SECURITY DEFINER functions in 0004.

-- ---------------------------------------------------------------- enable + force RLS
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','vendors','categories','products','product_variants',
    'variant_negotiation_settings','price_requests','price_request_recipients',
    'negotiation_threads','price_offers','stock_reservations','realtime_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    -- staff (system jobs, admin panel) see everything
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO suq_app USING (app.is_staff()) WITH CHECK (app.is_staff())',
                   t || '_staff', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------- users
CREATE POLICY users_self ON "users" FOR SELECT TO suq_app USING ("id" = app.user_id());

-- ---------------------------------------------------------------- vendors
CREATE POLICY vendors_own_rw ON "vendors" FOR ALL TO suq_app
  USING (app.is_vendor() AND "id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "id" = app.vendor_id());
-- Public store page reads vendors; iban is hidden by Prisma omit + DTO, not by RLS (row-level only).
CREATE POLICY vendors_public_read ON "vendors" FOR SELECT TO suq_app
  USING (app.ctx_role() IN ('public', 'customer', 'vendor'));

-- ---------------------------------------------------------------- categories
CREATE POLICY categories_read ON "categories" FOR SELECT TO suq_app
  USING (app.ctx_role() IS NOT NULL);

-- ---------------------------------------------------------------- products / variants
CREATE POLICY products_vendor_rw ON "products" FOR ALL TO suq_app
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY products_public_read ON "products" FOR SELECT TO suq_app
  USING (app.ctx_role() IN ('public', 'customer', 'vendor') AND "status" = 'PUBLISHED');

CREATE POLICY variants_vendor_rw ON "product_variants" FOR ALL TO suq_app
  USING (app.is_vendor() AND EXISTS (
    SELECT 1 FROM "products" p WHERE p."id" = "product_variants"."product_id" AND p."vendor_id" = app.vendor_id()))
  WITH CHECK (app.is_vendor() AND EXISTS (
    SELECT 1 FROM "products" p WHERE p."id" = "product_variants"."product_id" AND p."vendor_id" = app.vendor_id()));
CREATE POLICY variants_public_read ON "product_variants" FOR SELECT TO suq_app
  USING (app.ctx_role() IN ('public', 'customer', 'vendor') AND EXISTS (
    SELECT 1 FROM "products" p WHERE p."id" = "product_variants"."product_id" AND p."status" = 'PUBLISHED'));

-- ---------------------------------------------------------------- secret thresholds: owner vendor only
CREATE POLICY vns_owner_rw ON "variant_negotiation_settings" FOR ALL TO suq_app
  USING (app.is_vendor() AND EXISTS (
    SELECT 1 FROM "product_variants" v JOIN "products" p ON p."id" = v."product_id"
    WHERE v."id" = "variant_negotiation_settings"."variant_id" AND p."vendor_id" = app.vendor_id()))
  WITH CHECK (app.is_vendor() AND EXISTS (
    SELECT 1 FROM "product_variants" v JOIN "products" p ON p."id" = v."product_id"
    WHERE v."id" = "variant_negotiation_settings"."variant_id" AND p."vendor_id" = app.vendor_id()));
-- deliberately NO policy for customer/public.

-- ---------------------------------------------------------------- price requests
CREATE POLICY pr_customer_own ON "price_requests" FOR ALL TO suq_app
  USING (app.is_customer() AND "customer_id" = app.user_id())
  WITH CHECK (app.is_customer() AND "customer_id" = app.user_id());
CREATE POLICY pr_vendor_recipient_read ON "price_requests" FOR SELECT TO suq_app
  USING (app.is_vendor() AND EXISTS (
    SELECT 1 FROM "price_request_recipients" r
    WHERE r."request_id" = "price_requests"."id" AND r."vendor_id" = app.vendor_id()));

CREATE POLICY prr_vendor_own ON "price_request_recipients" FOR SELECT TO suq_app
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY prr_vendor_own_upd ON "price_request_recipients" FOR UPDATE TO suq_app
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());

-- ---------------------------------------------------------------- threads (sealed per vendor)
CREATE POLICY nt_vendor_own ON "negotiation_threads" FOR ALL TO suq_app
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND EXISTS (
    SELECT 1 FROM "price_request_recipients" r
    WHERE r."request_id" = "negotiation_threads"."request_id" AND r."vendor_id" = app.vendor_id()));
CREATE POLICY nt_customer_read ON "negotiation_threads" FOR SELECT TO suq_app
  USING (app.is_customer() AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "negotiation_threads"."request_id" AND pr."customer_id" = app.user_id()));
CREATE POLICY nt_customer_upd ON "negotiation_threads" FOR UPDATE TO suq_app
  USING (app.is_customer() AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "negotiation_threads"."request_id" AND pr."customer_id" = app.user_id()));

-- ---------------------------------------------------------------- offers (sealed per vendor)
CREATE POLICY po_vendor_own ON "price_offers" FOR ALL TO suq_app
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND EXISTS (
    SELECT 1 FROM "negotiation_threads" t WHERE t."id" = "price_offers"."thread_id" AND t."vendor_id" = app.vendor_id()));
CREATE POLICY po_customer_read ON "price_offers" FOR SELECT TO suq_app
  USING (app.is_customer() AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "price_offers"."request_id" AND pr."customer_id" = app.user_id()));
CREATE POLICY po_customer_counter ON "price_offers" FOR INSERT TO suq_app
  WITH CHECK (app.is_customer() AND "author" = 'CUSTOMER' AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "price_offers"."request_id" AND pr."customer_id" = app.user_id()));
CREATE POLICY po_customer_upd ON "price_offers" FOR UPDATE TO suq_app
  USING (app.is_customer() AND EXISTS (
    SELECT 1 FROM "price_requests" pr WHERE pr."id" = "price_offers"."request_id" AND pr."customer_id" = app.user_id()));

-- realtime_events is reachable only through SECURITY DEFINER functions owned by suq_owner (0004),
-- so the owner must not be subject to RLS on that one table.
ALTER TABLE "realtime_events" NO FORCE ROW LEVEL SECURITY;

-- stock_reservations / realtime_events: staff policy only (checkout runs reservation in 'system' context).
