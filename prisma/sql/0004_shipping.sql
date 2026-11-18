ALTER TABLE "shipping_zones"
  ADD CONSTRAINT "shipping_zones_fees_nonneg" CHECK ("base_fee" >= 0 AND "per_kg_fee" >= 0 AND coalesce("free_shipping_over", 0) >= 0 AND "eta_days" >= 0);
ALTER TABLE "shipments"
  ADD CONSTRAINT "shipments_amounts_nonneg" CHECK (coalesce("cost", 0) >= 0 AND coalesce("declared_value", 0) >= 0 AND coalesce("insured_amount", 0) >= 0),
  -- O10: no cash on delivery
  ADD CONSTRAINT "shipments_no_cod" CHECK ("cod_amount" = 0),
  ADD CONSTRAINT "shipments_return_link" CHECK ("direction" = 'OUTBOUND' OR "return_id" IS NOT NULL);

SELECT app.secure_table('shipping_zones');
SELECT app.secure_table('shipping_zone_cities', true);
SELECT app.secure_table('shipments');
SELECT app.secure_table('shipment_events');

CREATE POLICY shipping_zones_read ON "shipping_zones" FOR SELECT USING (app.is_reader() AND "is_active");
CREATE POLICY shipping_zone_cities_read ON "shipping_zone_cities" FOR SELECT USING (app.is_reader());

-- D17: in SELF_SHIPPING the vendor types carrier + tracking number for its own sub-orders.
CREATE POLICY shipments_read ON "shipments" FOR SELECT USING (app.sub_order_visible("sub_order_id"));
CREATE POLICY shipments_vendor_write ON "shipments" FOR INSERT
  WITH CHECK (app.is_vendor() AND app.sub_order_visible("sub_order_id") AND "provider" = 'MANUAL');
CREATE POLICY shipments_vendor_update ON "shipments" FOR UPDATE
  USING (app.is_vendor() AND app.sub_order_visible("sub_order_id"))
  WITH CHECK (app.is_vendor() AND app.sub_order_visible("sub_order_id"));
CREATE POLICY shipment_events_read ON "shipment_events" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "shipments" s WHERE s."id" = "shipment_events"."shipment_id" AND app.sub_order_visible(s."sub_order_id")));
CREATE POLICY shipment_events_vendor_insert ON "shipment_events" FOR INSERT
  WITH CHECK (app.is_vendor() AND EXISTS (SELECT 1 FROM "shipments" s WHERE s."id" = "shipment_events"."shipment_id" AND app.sub_order_visible(s."sub_order_id")));
