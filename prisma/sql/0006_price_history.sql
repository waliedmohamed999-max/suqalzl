-- H5: every price change is recorded by trigger (6.7: "before" price = last real selling price;
-- a deal is refused if the base price changed in the last 14 days).
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_price_pos" CHECK ("price" > 0);

-- SECURITY DEFINER + table without FORCE: the owner writes history whatever the caller context;
-- the runtime role cannot insert/update/delete it directly.
CREATE FUNCTION app.record_price_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW."price" IS DISTINCT FROM OLD."price" OR NEW."compare_at_price" IS DISTINCT FROM OLD."compare_at_price" THEN
    INSERT INTO "price_history" ("variant_id", "price", "compare_at_price", "changed_by_user_id")
    VALUES (NEW."id", NEW."price", NEW."compare_at_price", app.user_id());
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.record_price_history() FROM PUBLIC;
CREATE TRIGGER "product_variants_price_history" AFTER INSERT OR UPDATE OF "price", "compare_at_price" ON "product_variants"
  FOR EACH ROW EXECUTE FUNCTION app.record_price_history();

SELECT app.secure_table('price_history', false, false);
DO $$
DECLARE r name;
BEGIN
  FOR r IN SELECT * FROM app.runtime_roles() LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON "price_history" FROM %I', r);
  END LOOP;
END $$;
CREATE POLICY price_history_vendor_read ON "price_history" FOR SELECT
  USING (app.is_vendor() AND EXISTS (
    SELECT 1 FROM "product_variants" v WHERE v."id" = "price_history"."variant_id" AND app.owns_product(v."product_id")));
