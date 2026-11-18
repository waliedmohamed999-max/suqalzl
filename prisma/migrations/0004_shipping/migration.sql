-- 0004_shipping
-- shipping zones, manual shipments (D17, H3)
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0004_shipping.sql

-- ======================================================================= part 1: tables
CREATE TYPE "ShipmentDirection" AS ENUM ('OUTBOUND', 'RETURN');
CREATE TYPE "ShippingProviderCode" AS ENUM ('MANUAL');
CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED', 'CANCELLED');

CREATE TABLE "shipping_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "base_fee" INTEGER NOT NULL,
    "per_kg_fee" INTEGER NOT NULL DEFAULT 0,
    "free_shipping_over" INTEGER,
    "eta_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipping_zone_cities" (
    "zone_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    CONSTRAINT "shipping_zone_cities_pkey" PRIMARY KEY ("zone_id", "city_id")
);

CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_order_id" UUID NOT NULL,
    "return_id" UUID,
    "direction" "ShipmentDirection" NOT NULL DEFAULT 'OUTBOUND',
    "provider" "ShippingProviderCode" NOT NULL DEFAULT 'MANUAL',
    "carrier" TEXT NOT NULL,
    "provider_shipment_id" TEXT,
    "tracking_number" TEXT,
    "label_path" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "cost" INTEGER,
    "declared_value" INTEGER,
    "insured_amount" INTEGER,
    "cod_amount" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "provider_event_id" TEXT,
    "status" "ShipmentStatus" NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "raw" JSONB,
    "by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipping_zone_cities_city_id_idx" ON "shipping_zone_cities"("city_id");

CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");
CREATE INDEX "shipments_sub_order_id_idx" ON "shipments"("sub_order_id");
CREATE UNIQUE INDEX "shipments_provider_provider_shipment_id_key" ON "shipments"("provider", "provider_shipment_id");

CREATE UNIQUE INDEX "shipment_events_provider_event_id_key" ON "shipment_events"("provider_event_id");
CREATE INDEX "shipment_events_shipment_id_occurred_at_idx" ON "shipment_events"("shipment_id", "occurred_at");

ALTER TABLE "shipping_zone_cities" ADD CONSTRAINT "shipping_zone_cities_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipping_zone_cities" ADD CONSTRAINT "shipping_zone_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_sub_order_id_fkey" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ======================================================================= part 2: hand-written
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
