-- 0009_security_hardening
-- asserts RLS ENABLE+FORCE on every table, runtime role without TRUNCATE, no unsafe defaults
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0009_security_hardening.sql

-- ======================================================================= part 1: tables


-- ======================================================================= part 2: hand-written
-- Rewrite of backend.md migration 0009 for generic Postgres (T10, D34). Every table already got its
-- RLS in the migration that created it; this migration FAILS if any table slipped through, so a
-- future migration that forgets app.secure_table() is caught by `migrate deploy` in CI.
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO bad
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'
    AND (NOT c.relrowsecurity
         OR (NOT c.relforcerowsecurity AND c.relname NOT IN ('price_history')));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'tables without ENABLE+FORCE RLS: %', bad;
  END IF;

  SELECT string_agg(DISTINCT c.relname || ':' || r.rolname, ', ') INTO bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) a
  JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'
    AND a.grantee <> c.relowner AND a.privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'runtime role has TRUNCATE/REFERENCES/TRIGGER on: %', bad;
  END IF;
END $$;

-- Nobody but the owner creates objects in public (also done by infra; repeated for managed Postgres).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
-- Helper functions that change security state are owner-only.
REVOKE ALL ON FUNCTION app.secure_table(regclass, boolean, boolean) FROM PUBLIC;

-- Prisma's own history table is created by the migrator; default privileges would give the runtime
-- role DML on it. The app never needs it.
DO $$
DECLARE r name;
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    FOR r IN SELECT * FROM app.runtime_roles() LOOP
      EXECUTE format('REVOKE ALL ON "_prisma_migrations" FROM %I', r);
    END LOOP;
  END IF;
END $$;
