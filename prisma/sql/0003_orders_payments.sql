-- ---------------------------------------------------------------- CHECKs (backend.md 5.5, H12-H14)
ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_recipient_phone" CHECK ("recipient_phone" ~ '^\+9665[0-9]{8}$');

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_code_upper" CHECK ("code" = upper("code") AND "code" ~ '^[A-Z0-9_-]{3,32}$'),
  ADD CONSTRAINT "coupons_value" CHECK (
    ("type" = 'PERCENT' AND "value" BETWEEN 1 AND 10000) OR
    ("type" = 'FIXED' AND "value" > 0) OR
    ("type" = 'FREE_SHIPPING' AND "value" = 0)),
  ADD CONSTRAINT "coupons_amounts_nonneg" CHECK (coalesce("min_order", 0) >= 0 AND coalesce("max_discount", 0) >= 0 AND "used_count" >= 0),
  ADD CONSTRAINT "coupons_window" CHECK ("ends_at" > "starts_at"),
  -- D18: an active public coupon that needs approval must have it.
  ADD CONSTRAINT "coupons_approval_before_active" CHECK (NOT "is_active" OR "approval_status" IN ('NOT_REQUIRED', 'APPROVED'));

ALTER TABLE "carts" ADD CONSTRAINT "carts_owner" CHECK ("user_id" IS NOT NULL OR "guest_token_hash" IS NOT NULL);
ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_qty_pos" CHECK ("qty" > 0),
  ADD CONSTRAINT "cart_items_one_target" CHECK (num_nonnulls("variant_id", "bundle_id") = 1),
  ADD CONSTRAINT "cart_items_locked_price_pos" CHECK ("locked_unit_price" IS NULL OR "locked_unit_price" > 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amounts_nonneg" CHECK ("subtotal" >= 0 AND "discount_total" >= 0 AND "shipping_total" >= 0 AND "vat_total" >= 0 AND "grand_total" >= 0),
  ADD CONSTRAINT "orders_grand_total" CHECK ("grand_total" = "subtotal" - "discount_total" + "shipping_total"),
  ADD CONSTRAINT "orders_vat_rate" CHECK ("vat_rate_bp" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "orders_buyer_vat" CHECK ("buyer_vat_number" IS NULL OR "buyer_vat_number" ~ '^3[0-9]{13}3$'),
  ADD CONSTRAINT "orders_standard_needs_vat" CHECK ("invoice_type" = 'SIMPLIFIED' OR "buyer_vat_number" IS NOT NULL);

ALTER TABLE "sub_orders"
  ADD CONSTRAINT "sub_orders_amounts_nonneg" CHECK (
    "items_gross" >= 0 AND "subtotal" >= 0 AND "platform_discount_share" >= 0 AND "vendor_discount_share" >= 0
    AND "shipping_fee" >= 0 AND "vat_amount" >= 0 AND "total" >= 0 AND "commission_base_net" >= 0
    AND "commission_amount" >= 0 AND "gateway_fee_share" >= 0 AND "shipping_net_to_vendor" >= 0 AND "vendor_vat" >= 0),
  ADD CONSTRAINT "sub_orders_total" CHECK ("total" = "subtotal" - "platform_discount_share" - "vendor_discount_share" + "shipping_fee"),
  ADD CONSTRAINT "sub_orders_commission_bps" CHECK ("commission_rate" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "sub_orders_vat_rate" CHECK ("vat_rate_bp" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "sub_orders_payable" CHECK ("vendor_payable" = "vendor_net" + "vendor_vat"),
  -- 6.1: platform products (vendor_id null) carry no commission and no payable
  ADD CONSTRAINT "sub_orders_platform_no_payable" CHECK ("vendor_id" IS NOT NULL OR ("commission_amount" = 0 AND "vendor_payable" = 0));

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_qty_pos" CHECK ("qty" > 0),
  ADD CONSTRAINT "order_items_one_target" CHECK (num_nonnulls("variant_id", "bundle_id") = 1),
  ADD CONSTRAINT "order_items_amounts" CHECK ("unit_price" >= 0 AND "line_total" = "unit_price" * "qty"
    AND "platform_discount" >= 0 AND "vendor_discount" >= 0 AND "net_amount" >= 0 AND "vat_amount" >= 0),
  ADD CONSTRAINT "order_items_net_vat" CHECK ("net_amount" + "vat_amount" = "line_total" - "platform_discount" - "vendor_discount");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_pos" CHECK ("amount" > 0),
  ADD CONSTRAINT "payments_currency" CHECK ("currency" = 'SAR'),
  ADD CONSTRAINT "payments_refunded" CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "amount");
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_amount_pos" CHECK ("amount" > 0);
ALTER TABLE "returns" ADD CONSTRAINT "returns_refund_nonneg" CHECK ("refund_amount" >= 0);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "tax_invoices"
  ADD CONSTRAINT "tax_invoices_totals" CHECK ("gross_total" = "net_total" + "vat_total" AND "net_total" >= 0 AND "vat_total" >= 0),
  ADD CONSTRAINT "tax_invoices_note_has_original" CHECK ("kind" = 'INVOICE' OR "original_invoice_id" IS NOT NULL),
  ADD CONSTRAINT "tax_invoices_standard_buyer" CHECK ("type" = 'SIMPLIFIED' OR "buyer_vat_number" IS NOT NULL);
ALTER TABLE "tax_invoice_lines"
  ADD CONSTRAINT "tax_invoice_lines_amounts" CHECK ("gross_amount" = "net_amount" + "vat_amount" AND "qty" > 0 AND "discount" >= 0);

-- Cron "cancel unpaid after 30 min" (6.2-5) and reconciliation (6.2-14)
CREATE INDEX "orders_pending_payment_idx" ON "orders" ("placed_at") WHERE "status" = 'PENDING_PAYMENT';
CREATE INDEX "webhook_events_unprocessed_idx" ON "webhook_events" ("received_at") WHERE "processed_at" IS NULL;
-- C4/5.1: one capture per payment (redirect + webhook race, 6.2-12)
CREATE UNIQUE INDEX "payment_transactions_one_capture" ON "payment_transactions" ("payment_id")
  WHERE "type" = 'CAPTURE' AND "status" <> 'FAILED';

-- ---------------------------------------------------------------- guards
-- Financial values are frozen at payment time (6.1). Vendors may only move status/timestamps.
CREATE FUNCTION app.guard_sub_orders() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','shipped_at','delivered_at','cancelled_at','cancel_reason','updated_at'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','shipped_at','delivered_at','cancelled_at','cancel_reason','updated_at']) THEN
    RAISE EXCEPTION 'sub-order financial columns are frozen' USING ERRCODE = '42501';
  END IF;
  -- vendors move only NEW→PREPARING→READY_TO_SHIP→SHIPPED (+ cancel from NEW/PREPARING) — 6.3.
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
       (OLD."status" = 'NEW' AND NEW."status" IN ('PREPARING', 'CANCELLED'))
    OR (OLD."status" = 'PREPARING' AND NEW."status" IN ('READY_TO_SHIP', 'CANCELLED'))
    OR (OLD."status" = 'READY_TO_SHIP' AND NEW."status" = 'SHIPPED')
    OR (OLD."status" = 'SHIPPED' AND NEW."status" = 'DELIVERED')) THEN
    RAISE EXCEPTION 'sub-order transition % -> % not allowed here', OLD."status", NEW."status" USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "sub_orders_guard" BEFORE UPDATE ON "sub_orders" FOR EACH ROW EXECUTE FUNCTION app.guard_sub_orders();

-- D13: invoices are never edited or deleted; only ZATCA integration fields may be filled later (P8).
CREATE FUNCTION app.guard_tax_invoices() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['zatca_status','zatca_response','xml_path','pdf_path'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['zatca_status','zatca_response','xml_path','pdf_path']) THEN
    RAISE EXCEPTION 'tax invoices are immutable (issue a credit/debit note)' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "tax_invoices_guard" BEFORE UPDATE ON "tax_invoices" FOR EACH ROW EXECUTE FUNCTION app.guard_tax_invoices();
CREATE TRIGGER "tax_invoices_no_delete" BEFORE DELETE ON "tax_invoices" FOR EACH ROW EXECUTE FUNCTION app.forbid_delete();
CREATE TRIGGER "tax_invoice_lines_no_update" BEFORE UPDATE ON "tax_invoice_lines" FOR EACH ROW EXECUTE FUNCTION app.forbid_update();
CREATE TRIGGER "tax_invoice_lines_no_delete" BEFORE DELETE ON "tax_invoice_lines" FOR EACH ROW EXECUTE FUNCTION app.forbid_delete();

-- ---------------------------------------------------------------- RLS
SELECT app.secure_table('addresses', true);
SELECT app.secure_table('coupons');
SELECT app.secure_table('carts', true);
SELECT app.secure_table('cart_items', true);
SELECT app.secure_table('orders');
SELECT app.secure_table('sub_orders');
SELECT app.secure_table('order_items');
SELECT app.secure_table('order_status_history');
SELECT app.secure_table('payments');
SELECT app.secure_table('payment_transactions');
SELECT app.secure_table('webhook_events');
SELECT app.secure_table('returns');
SELECT app.secure_table('reviews');
SELECT app.secure_table('tax_invoices');
SELECT app.secure_table('tax_invoice_lines');

CREATE FUNCTION app.owns_order(p_order uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app.is_customer() AND EXISTS (SELECT 1 FROM "orders" o WHERE o."id" = p_order AND o."user_id" = app.user_id())
$$;
CREATE FUNCTION app.sub_order_visible(p_sub uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "sub_orders" s
    WHERE s."id" = p_sub
      AND ((app.is_vendor() AND s."vendor_id" = app.vendor_id()) OR app.owns_order(s."order_id")))
$$;

CREATE POLICY addresses_own ON "addresses" FOR ALL USING (app.is_customer() AND "user_id" = app.user_id())
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id());

-- coupons: vendor manages its own; public validation runs in a system step at checkout.
CREATE POLICY coupons_vendor ON "coupons" FOR ALL
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND "approval_status" = 'NOT_REQUIRED');

CREATE POLICY carts_own ON "carts" FOR ALL USING (app.is_customer() AND "user_id" = app.user_id())
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id());
CREATE POLICY cart_items_own ON "cart_items" FOR ALL
  USING (EXISTS (SELECT 1 FROM "carts" c WHERE c."id" = "cart_items"."cart_id" AND app.is_customer() AND c."user_id" = app.user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "carts" c WHERE c."id" = "cart_items"."cart_id" AND app.is_customer() AND c."user_id" = app.user_id()));

CREATE POLICY orders_customer_read ON "orders" FOR SELECT USING (app.is_customer() AND "user_id" = app.user_id());

CREATE POLICY sub_orders_customer_read ON "sub_orders" FOR SELECT USING (app.owns_order("order_id"));
CREATE POLICY sub_orders_vendor_read ON "sub_orders" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY sub_orders_vendor_update ON "sub_orders" FOR UPDATE
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id()) WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());

CREATE POLICY order_items_read ON "order_items" FOR SELECT USING (app.sub_order_visible("sub_order_id"));
CREATE POLICY order_status_history_read ON "order_status_history" FOR SELECT USING (app.sub_order_visible("sub_order_id"));
CREATE POLICY order_status_history_vendor_insert ON "order_status_history" FOR INSERT
  WITH CHECK (app.is_vendor() AND app.sub_order_visible("sub_order_id") AND "by_user_id" = app.user_id());

-- payments / payment_transactions / webhook_events: staff + system only.

CREATE POLICY returns_customer ON "returns" FOR SELECT USING (app.is_customer() AND "user_id" = app.user_id());
CREATE POLICY returns_customer_insert ON "returns" FOR INSERT
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id() AND "status" = 'REQUESTED' AND app.sub_order_visible("sub_order_id"));
CREATE POLICY returns_vendor_read ON "returns" FOR SELECT
  USING (app.is_vendor() AND EXISTS (SELECT 1 FROM "sub_orders" s WHERE s."id" = "returns"."sub_order_id" AND s."vendor_id" = app.vendor_id()));

CREATE POLICY reviews_public ON "reviews" FOR SELECT USING (app.is_reader() AND "status" = 'APPROVED');
CREATE POLICY reviews_own ON "reviews" FOR SELECT USING (app.is_customer() AND "user_id" = app.user_id());
CREATE POLICY reviews_own_insert ON "reviews" FOR INSERT
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id() AND "status" = 'PENDING' AND "vendor_reply" IS NULL);
CREATE POLICY reviews_vendor_read ON "reviews" FOR SELECT USING (app.owns_product("product_id"));
CREATE POLICY reviews_vendor_reply ON "reviews" FOR UPDATE USING (app.owns_product("product_id")) WITH CHECK (app.owns_product("product_id"));

CREATE POLICY tax_invoices_customer ON "tax_invoices" FOR SELECT USING (app.owns_order("order_id"));
CREATE POLICY tax_invoice_lines_customer ON "tax_invoice_lines" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "tax_invoices" i WHERE i."id" = "tax_invoice_lines"."invoice_id" AND app.owns_order(i."order_id")));

-- vendors may only write vendor_reply on reviews of their products
CREATE FUNCTION app.guard_reviews() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - ARRAY['vendor_reply','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['vendor_reply','updated_at']) THEN
    RAISE EXCEPTION 'only vendor_reply can be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "reviews_guard" BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION app.guard_reviews();
