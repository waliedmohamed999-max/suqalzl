/**
 * Drops and recreates the application schemas (public, app) of ONE database as the owner role,
 * restoring the grants that docker/postgres/init gives (runtime-role USAGE + default privileges),
 * then applies all migrations. For the TEST database (and local dev with --force) only.
 *
 * Usage: npm run db:reset:test                     (TEST_DIRECT_URL)
 *        npx tsx scripts/db/reset-db.ts --dev --force (DIRECT_URL)
 */
import "dotenv/config";
import path from "node:path";
import pg from "pg";
import { applyMigrations } from "./apply-migrations";

export async function resetDatabase(ownerUrl: string, opts: { allowNonTest?: boolean; log?: (s: string) => void } = {}) {
  const log = opts.log ?? console.log;
  const dbName = new URL(ownerUrl).pathname.slice(1);
  if (!dbName.endsWith("_test") && !opts.allowNonTest) throw new Error(`refusing to reset non-test database "${dbName}"`);
  const c = new pg.Client({ connectionString: ownerUrl });
  await c.connect();
  try {
    const owner = (await c.query<{ u: string }>("SELECT current_user AS u")).rows[0]!.u;
    const runtime = (
      await c.query<{ rolname: string }>(`
        SELECT DISTINCT r.rolname FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a
        JOIN pg_roles r ON r.oid = a.grantee
        WHERE n.nspname = 'public' AND a.privilege_type = 'USAGE' AND a.grantee <> n.nspowner AND NOT r.rolsuper`)
    ).rows.map((r) => r.rolname);
    if (runtime.length === 0) throw new Error("no runtime role has USAGE on schema public — run docker/postgres/init first");
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    await c.query("DROP SCHEMA IF EXISTS app CASCADE");
    await c.query("DROP SCHEMA IF EXISTS public CASCADE");
    await c.query("CREATE SCHEMA public");
    await c.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    for (const r of runtime) {
      await c.query(`GRANT USAGE ON SCHEMA public TO ${q(r)}`);
      await c.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${q(owner)} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${q(r)}`);
      await c.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${q(owner)} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${q(r)}`);
      await c.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${q(owner)} IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${q(r)}`);
    }
    log(`reset ${dbName} (runtime roles: ${runtime.join(", ")})`);
  } finally {
    await c.end();
  }
  await applyMigrations(ownerUrl, () => {});
  log(`migrated ${dbName}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  const dev = process.argv.includes("--dev");
  const url = dev ? process.env.DIRECT_URL : process.env.TEST_DIRECT_URL;
  if (!url) throw new Error(dev ? "DIRECT_URL is required" : "TEST_DIRECT_URL is required");
  if (dev && !process.argv.includes("--force")) throw new Error("--dev needs --force (this wipes the database)");
  resetDatabase(url, { allowNonTest: dev }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
