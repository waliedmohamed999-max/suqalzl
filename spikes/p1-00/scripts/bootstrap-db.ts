/**
 * Creates the two DB roles and the spike database. Runs as a superuser (ADMIN_DATABASE_URL).
 * In real environments this is infra (devops), not app code:
 *   suq_owner : owns schema objects, runs migrations. Never used by the running app.
 *   suq_app   : runtime role. NOSUPERUSER NOBYPASSRLS, not owner -> RLS policies apply.
 * Usage: tsx scripts/bootstrap-db.ts [--drop]
 */
import "dotenv/config";
import pg from "pg";

const admin = process.env.ADMIN_DATABASE_URL;
if (!admin) throw new Error("ADMIN_DATABASE_URL missing");

const owner = new URL(process.env.DATABASE_URL!);
const app = new URL(process.env.APP_DATABASE_URL!);
const dbName = owner.pathname.slice(1);

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const c = new pg.Client({ connectionString: admin });
  await c.connect();
  try {
    if (process.argv.includes("--drop")) {
      await c.query(`DROP DATABASE IF EXISTS ${q(dbName)} WITH (FORCE)`);
    }
    for (const [u, extra] of [
      [owner, "CREATEDB"],
      [app, ""],
    ] as const) {
      const name = decodeURIComponent(u.username);
      const pw = decodeURIComponent(u.password);
      const exists = await c.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [name]);
      const verb = exists.rowCount ? "ALTER" : "CREATE";
      await c.query(
        `${verb} ROLE ${q(name)} LOGIN PASSWORD ${lit(pw)} NOSUPERUSER NOBYPASSRLS NOCREATEROLE ${extra}`,
      );
    }
    const db = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (!db.rowCount) {
      await c.query(`CREATE DATABASE ${q(dbName)} OWNER ${q(decodeURIComponent(owner.username))}`);
    }
    // Runtime role may connect; everything else is granted by migrations.
    await c.query(`REVOKE ALL ON DATABASE ${q(dbName)} FROM PUBLIC`);
    await c.query(`GRANT CONNECT ON DATABASE ${q(dbName)} TO ${q(decodeURIComponent(app.username))}`);
    console.log(`bootstrap ok: db=${dbName}`);
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
