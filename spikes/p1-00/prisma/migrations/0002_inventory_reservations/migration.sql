-- 0002_inventory_reservations (backend.md C3)
-- Invariants enforced by the database, not only by the service.
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_stock_nonneg" CHECK ("stock" >= 0),
  ADD CONSTRAINT "product_variants_reserved_nonneg" CHECK ("reserved_stock" >= 0),
  ADD CONSTRAINT "product_variants_reserved_le_stock" CHECK ("reserved_stock" <= "stock"),
  ADD CONSTRAINT "product_variants_price_pos" CHECK ("price" > 0);

ALTER TABLE "stock_reservations"
  ADD CONSTRAINT "stock_reservations_qty_pos" CHECK ("qty" > 0);

-- Expiry sweep only scans live rows.
CREATE INDEX "stock_reservations_active_expires_idx"
  ON "stock_reservations" ("expires_at") WHERE "status" = 'ACTIVE';

-- C6: secret thresholds sanity.
ALTER TABLE "variant_negotiation_settings"
  ADD CONSTRAINT "vns_floor_pos" CHECK ("floor_price" > 0),
  ADD CONSTRAINT "vns_auto_ge_floor" CHECK ("auto_accept_price" IS NULL OR "auto_accept_price" >= "floor_price");

ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_qty_pos" CHECK ("qty" > 0);
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_qty_pos" CHECK ("qty" > 0);

-- H9/H10: one PENDING offer per thread, one ACCEPTED offer per request.
CREATE UNIQUE INDEX "price_offers_one_pending_per_thread" ON "price_offers" ("thread_id") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "price_offers_one_accepted_per_request" ON "price_offers" ("request_id") WHERE "status" = 'ACCEPTED';
