-- 0006_price_history
-- price history written by trigger (H5)
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0006_price_history.sql

-- ======================================================================= part 1: tables
CREATE TABLE "price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "price" INTEGER NOT NULL,
    "compare_at_price" INTEGER,
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "price_history_variant_id_changed_at_idx" ON "price_history"("variant_id", "changed_at" DESC);

ALTER TABLE "price_history" ADD CONSTRAINT "price_history_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ======================================================================= part 2: hand-written
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
