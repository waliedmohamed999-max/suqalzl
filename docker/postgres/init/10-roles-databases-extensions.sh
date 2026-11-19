#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Souq AlZal — Postgres 16 bootstrap (DEV + CI only).
#
# Runs automatically ONCE, when the `postgres` container starts with an empty
# volume (via /docker-entrypoint-initdb.d). CI runs the same file against the
# Postgres service container (.github/workflows/ci.yml), so dev and CI match.
# It is idempotent: running it twice is safe.
#
# What it creates:
#   - role  $DB_MIGRATOR_USER : owns the schema, runs `prisma migrate` (DIRECT_URL).
#                               CREATEDB so `prisma migrate dev` can make a shadow DB.
#   - role  $DB_APP_USER      : what the app connects as (DATABASE_URL). DML only,
#                               NOT owner, NOBYPASSRLS -> Row Level Security applies
#                               (SPEC §4, P1-00 spike). A superuser or table owner
#                               silently bypasses RLS, so never run the app as either.
#   - databases $POSTGRES_DB (dev) and $POSTGRES_TEST_DB (Vitest/Playwright), plus
#     the empty throwaway $POSTGRES_SHADOW_DB (owner: migrator) that Prisma resets
#     for `prisma migrate diff --from-migrations` / `migrate dev`
#     (SHADOW_DATABASE_URL, prisma.config.ts). It has no app grants on purpose.
#   - extensions in template1 + both DBs: btree_gist (exclusion constraint, backend
#     H6), citext (User.email, M14), pg_trgm (Arabic search helper).
#   - timezone UTC everywhere (SPEC §2 "الوقت").
#
# Connection: inside the container entrypoint it uses the local socket. In CI set
# PGHOST/PGPORT/PGPASSWORD and POSTGRES_USER before calling it.
# -----------------------------------------------------------------------------
set -euo pipefail

SUPERUSER="${POSTGRES_USER:-postgres}"
APP_DB="${POSTGRES_DB:-suqalzl}"
TEST_DB="${POSTGRES_TEST_DB:-suqalzl_test}"
SHADOW_DB="${POSTGRES_SHADOW_DB:-suqalzl_shadow}"
APP_USER="${DB_APP_USER:-suqalzl_app}"
APP_PASSWORD="${DB_APP_PASSWORD:-suqalzl_app_dev_only}"
MIGRATOR_USER="${DB_MIGRATOR_USER:-suqalzl_migrator}"
MIGRATOR_PASSWORD="${DB_MIGRATOR_PASSWORD:-suqalzl_migrator_dev_only}"
EXTENSIONS=(btree_gist citext pg_trgm)

psql_su() {
  # $1 = database, rest = psql args
  local db="$1"; shift
  psql -v ON_ERROR_STOP=1 --no-psqlrc --quiet --username "$SUPERUSER" --dbname "$db" "$@"
}

echo "[init] roles: $MIGRATOR_USER (migrations), $APP_USER (app, RLS applies)"
psql_su postgres \
  -v migrator="$MIGRATOR_USER" -v migrator_pw="$MIGRATOR_PASSWORD" \
  -v app="$APP_USER" -v app_pw="$APP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER CREATEDB NOCREATEROLE NOBYPASSRLS', :'migrator')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migrator') \gexec
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS', :'app')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'migrator', :'migrator_pw') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'app', :'app_pw') \gexec

-- Same guard rails the production app role will get (docs/decisions/devops.md §6.4).
SELECT format('ALTER ROLE %I SET statement_timeout = %L', :'app', '15s') \gexec
SELECT format('ALTER ROLE %I SET idle_in_transaction_session_timeout = %L', :'app', '30s') \gexec
SELECT format('ALTER ROLE %I SET timezone = %L', :'app', 'UTC') \gexec
SELECT format('ALTER ROLE %I SET timezone = %L', :'migrator', 'UTC') \gexec
SQL

echo "[init] databases: $APP_DB, $TEST_DB"
psql_su postgres -v app_db="$APP_DB" -v test_db="$TEST_DB" -v migrator="$MIGRATOR_USER" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'app_db', :'migrator')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_db') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'test_db', :'migrator')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'test_db') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'app_db', :'migrator') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'test_db', :'migrator') \gexec
SQL

# template1 first, so databases created later (prisma shadow DB, `migrate reset`)
# inherit the extensions and default privileges.
for db in template1 "$APP_DB" "$TEST_DB"; do
  echo "[init] $db: extensions (${EXTENSIONS[*]}), schema privileges, UTC"
  {
    for ext in "${EXTENSIONS[@]}"; do
      echo "CREATE EXTENSION IF NOT EXISTS ${ext};"
    done
    cat <<'SQL'
SELECT format('ALTER SCHEMA public OWNER TO %I', :'migrator') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'migrator', :'app') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', :'migrator', :'app') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO %I', :'migrator', :'app') \gexec
SQL
    if [ "$db" != "template1" ]; then
      cat <<'SQL'
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT, TEMPORARY ON DATABASE %I TO %I, %I', current_database(), :'app', :'migrator') \gexec
SELECT format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC') \gexec
SQL
    fi
  } | psql_su "$db" -v app="$APP_USER" -v migrator="$MIGRATOR_USER"
done

# Shadow DB last, so it is copied from the finished template1 (extensions, UTC).
echo "[init] shadow database: $SHADOW_DB (Prisma resets it; never put data in it)"
psql_su postgres -v shadow_db="$SHADOW_DB" -v migrator="$MIGRATOR_USER" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I TEMPLATE template1', :'shadow_db', :'migrator')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'shadow_db') \gexec
SELECT format('ALTER DATABASE %I SET timezone TO %L', :'shadow_db', 'UTC') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'shadow_db') \gexec
SQL

echo "[init] done"
