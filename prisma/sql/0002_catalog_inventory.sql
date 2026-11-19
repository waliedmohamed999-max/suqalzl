-- ---------------------------------------------------------------- search vector (P2-01 fills it)
ALTER TABLE "products" ADD COLUMN "search_vector" tsvector;
CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");

-- ---------------------------------------------------------------- CHECKs (backend.md 5.5, C3)
ALTER TABLE "products"
  ADD CONSTRAINT "products_base_price_pos" CHECK ("base_price" > 0),
  ADD CONSTRAINT "products_compare_at_gt" CHECK ("compare_at_price" IS NULL OR "compare_at_price" > "base_price"),
  ADD CONSTRAINT "products_weight_nonneg" CHECK ("weight_grams" >= 0),
  ADD CONSTRAINT "products_counters_nonneg" CHECK ("rating_count" >= 0 AND "sold_count" >= 0);
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_stock_nonneg" CHECK ("stock" >= 0),
  ADD CONSTRAINT "product_variants_reserved_nonneg" CHECK ("reserved_stock" >= 0),
  ADD CONSTRAINT "product_variants_reserved_le_stock" CHECK ("reserved_stock" <= "stock"),
  ADD CONSTRAINT "product_variants_price_pos" CHECK ("price" > 0),
  ADD CONSTRAINT "product_variants_compare_at_gt" CHECK ("compare_at_price" IS NULL OR "compare_at_price" > "price");
ALTER TABLE "bundles"
  ADD CONSTRAINT "bundles_price_pos" CHECK ("price" > 0),
  ADD CONSTRAINT "bundles_compare_at_gt" CHECK ("compare_at_price" IS NULL OR "compare_at_price" > "price");
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_qty_pos" CHECK ("qty" > 0);
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_qty_pos" CHECK ("qty" > 0);

-- Expiry sweep scans live rows only.
CREATE INDEX "stock_reservations_active_expires_idx" ON "stock_reservations" ("expires_at") WHERE "status" = 'ACTIVE';

-- ---------------------------------------------------------------- guards
-- Publishing / rejecting / featuring is a staff decision (D5: trusted vendors publish through the
-- service in a system step, not by writing the column themselves).
CREATE FUNCTION app.guard_products() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" NOT IN ('DRAFT', 'PENDING') OR NEW."is_featured" THEN
      RAISE EXCEPTION 'vendors create products as DRAFT or PENDING' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW."status" IS DISTINCT FROM OLD."status" AND NEW."status" NOT IN ('DRAFT', 'PENDING', 'ARCHIVED'))
     OR NEW."is_featured" IS DISTINCT FROM OLD."is_featured"
     OR NEW."vendor_id" IS DISTINCT FROM OLD."vendor_id"
     OR NEW."rating_avg" IS DISTINCT FROM OLD."rating_avg"
     OR NEW."rating_count" IS DISTINCT FROM OLD."rating_count"
     OR NEW."sold_count" IS DISTINCT FROM OLD."sold_count"
     OR NEW."published_at" IS DISTINCT FROM OLD."published_at" THEN
    RAISE EXCEPTION 'privileged product columns can only be changed by staff' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "products_guard" BEFORE INSERT OR UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION app.guard_products();

-- reserved_stock moves only through the reservation service (system context, C3).
CREATE FUNCTION app.guard_variants() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF (TG_OP = 'INSERT' AND NEW."reserved_stock" <> 0)
     OR (TG_OP = 'UPDATE' AND NEW."reserved_stock" IS DISTINCT FROM OLD."reserved_stock") THEN
    RAISE EXCEPTION 'reserved_stock is managed by the reservation service' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "product_variants_guard" BEFORE INSERT OR UPDATE ON "product_variants" FOR EACH ROW EXECUTE FUNCTION app.guard_variants();

-- ---------------------------------------------------------------- RLS
SELECT app.secure_table('products');
SELECT app.secure_table('product_revisions');
SELECT app.secure_table('product_images', true);
SELECT app.secure_table('product_options', true);
SELECT app.secure_table('option_values', true);
SELECT app.secure_table('product_variants');
SELECT app.secure_table('bundles');
SELECT app.secure_table('bundle_items', true);
SELECT app.secure_table('stock_reservations');
SELECT app.secure_table('wishlists', true);

-- owner check used by the child tables
CREATE FUNCTION app.owns_product(p_product uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app.is_vendor() AND EXISTS (SELECT 1 FROM "products" p WHERE p."id" = p_product AND p."vendor_id" = app.vendor_id())
$$;
CREATE FUNCTION app.product_is_public(p_product uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app.is_reader() AND EXISTS (SELECT 1 FROM "products" p WHERE p."id" = p_product AND p."status" = 'PUBLISHED')
$$;

CREATE POLICY products_vendor_rw ON "products" FOR ALL
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());
-- Public catalogue. NOTE (P1-00): RLS cannot catch a vendor-panel bug that READS other vendors'
-- published products; service-layer tests are mandatory for that.
CREATE POLICY products_public_read ON "products" FOR SELECT USING (app.is_reader() AND "status" = 'PUBLISHED');

CREATE POLICY product_revisions_vendor ON "product_revisions" FOR ALL
  USING (app.owns_product("product_id")) WITH CHECK (app.owns_product("product_id") AND "status" = 'PENDING');

CREATE POLICY product_images_vendor ON "product_images" FOR ALL USING (app.owns_product("product_id")) WITH CHECK (app.owns_product("product_id"));
CREATE POLICY product_images_public ON "product_images" FOR SELECT USING (app.product_is_public("product_id"));

CREATE POLICY product_options_vendor ON "product_options" FOR ALL USING (app.owns_product("product_id")) WITH CHECK (app.owns_product("product_id"));
CREATE POLICY product_options_public ON "product_options" FOR SELECT USING (app.product_is_public("product_id"));

CREATE POLICY option_values_vendor ON "option_values" FOR ALL
  USING (EXISTS (SELECT 1 FROM "product_options" o WHERE o."id" = "option_values"."option_id" AND app.owns_product(o."product_id")))
  WITH CHECK (EXISTS (SELECT 1 FROM "product_options" o WHERE o."id" = "option_values"."option_id" AND app.owns_product(o."product_id")));
CREATE POLICY option_values_public ON "option_values" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "product_options" o WHERE o."id" = "option_values"."option_id" AND app.product_is_public(o."product_id")));

CREATE POLICY variants_vendor ON "product_variants" FOR ALL USING (app.owns_product("product_id")) WITH CHECK (app.owns_product("product_id"));
CREATE POLICY variants_public ON "product_variants" FOR SELECT USING (app.product_is_public("product_id"));

CREATE POLICY bundles_public ON "bundles" FOR SELECT USING (app.is_reader() AND "is_active");
CREATE POLICY bundle_items_public ON "bundle_items" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "bundles" b WHERE b."id" = "bundle_items"."bundle_id" AND b."is_active" AND app.is_reader()));

-- stock_reservations: staff/system only (checkout runs reservation in a system step).

CREATE POLICY wishlists_own ON "wishlists" FOR ALL USING ("user_id" = app.user_id()) WITH CHECK ("user_id" = app.user_id());
