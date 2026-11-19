-- Extensions are pre-installed by docker/postgres/init (dev, CI, template1). IF NOT EXISTS keeps
-- this portable to managed Postgres where the migrator may create trusted extensions itself.
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------------------------
-- RLS context (P1-00, SPEC §4 "RLS — القرار النهائي", D34)
--   Every request runs in ONE transaction that first calls
--     set_config('app.role'|'app.vendor_id'|'app.user_id', ..., true)   (= SET LOCAL)
--   via src/lib/db.ts::withCtx. No context => no policy matches => no rows (fail closed).
--   app.role in ('system','admin','vendor','customer','public').
--   RLS is a SECOND layer against bugs, not against SQL injection (no *RawUnsafe in the app).
-- ---------------------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO PUBLIC;

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
-- "Reader" contexts that may see public catalogue rows. Staff is covered by the staff policy.
CREATE FUNCTION app.is_reader() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() IN ('public', 'customer', 'vendor'), false) $$;

-- The runtime role is not hard-coded (dev: suqalzl_app; other environments may differ): it is any
-- non-superuser, non-owner role that infra granted USAGE on schema public
-- (docker/postgres/init/10-roles-databases-extensions.sh does exactly that).
CREATE FUNCTION app.runtime_roles() RETURNS SETOF name LANGUAGE sql STABLE AS $$
  SELECT r.rolname
  FROM pg_namespace n
  CROSS JOIN LATERAL aclexplode(n.nspacl) a
  JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public' AND a.privilege_type = 'USAGE'
    AND a.grantee <> n.nspowner AND NOT r.rolsuper
$$;

-- ENABLE + FORCE RLS, staff policy, and strip TRUNCATE/REFERENCES/TRIGGER (and DELETE unless
-- p_allow_delete) from every non-owner grantee (the runtime role got DML via default privileges).
-- Called for EVERY table right after it is created (SPEC §2: RLS in the same migration).
CREATE FUNCTION app.secure_table(p_table regclass, p_allow_delete boolean DEFAULT false, p_force boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  g record;
  t text := p_table::text;
  base text := regexp_replace(p_table::text, '^.*\.|"', '', 'g');
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
  IF p_force THEN
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
  END IF;
  EXECUTE format('CREATE POLICY %I ON %s FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff())', base || '_staff', t);
  FOR g IN
    SELECT DISTINCT r.rolname
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(c.relacl) a
    JOIN pg_roles r ON r.oid = a.grantee
    WHERE c.oid = p_table AND a.grantee <> c.relowner
  LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON %s FROM %I', t, g.rolname);
    IF NOT p_allow_delete THEN
      EXECUTE format('REVOKE DELETE ON %s FROM %I', t, g.rolname);
    END IF;
  END LOOP;
  EXECUTE format('REVOKE ALL ON %s FROM PUBLIC', t);
END $$;

-- Append-only guard (audit_logs M11, wallet_transactions C7, tax_invoices D13).
CREATE FUNCTION app.forbid_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: DELETE is not allowed', TG_TABLE_NAME USING ERRCODE = '42501';
END $$;
CREATE FUNCTION app.forbid_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: UPDATE is not allowed', TG_TABLE_NAME USING ERRCODE = '42501';
END $$;
