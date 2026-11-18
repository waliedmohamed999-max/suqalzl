/**
 * Minimal stand-in for `prisma migrate deploy` (the Prisma schema-engine binary is not downloadable
 * in this sandbox). Applies prisma/migrations/<name>/migration.sql in order, once, each in a transaction,
 * as the OWNER role (DATABASE_URL). Records name + sha256 in _spike_migrations and refuses edited files.
 * In P1-01 use the real `prisma migrate deploy` — the folder layout is identical.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const dir = path.resolve("prisma/migrations");

async function main() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS _spike_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    await c.query(`REVOKE ALL ON _spike_migrations FROM PUBLIC`);
    const done = new Map(
      (await c.query("SELECT name, checksum FROM _spike_migrations")).rows.map((r) => [r.name, r.checksum]),
    );
    const names = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const name of names) {
      const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
      const sum = createHash("sha256").update(sql).digest("hex");
      if (done.has(name)) {
        if (done.get(name) !== sum) throw new Error(`migration ${name} was edited after being applied`);
        continue;
      }
      await c.query("BEGIN");
      try {
        await c.query(sql);
        await c.query("INSERT INTO _spike_migrations (name, checksum) VALUES ($1, $2)", [name, sum]);
        await c.query("COMMIT");
        console.log(`applied ${name}`);
      } catch (e) {
        await c.query("ROLLBACK");
        throw new Error(`migration ${name} failed: ${(e as Error).message}`);
      }
    }
    console.log("migrations up to date");
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
