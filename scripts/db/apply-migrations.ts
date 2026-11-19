/**
 * Local stand-in for `prisma migrate deploy` where the Prisma schema-engine binary cannot be
 * downloaded (sandbox: binaries.prisma.sh → 403; see docs/runbooks/db-migrations.md).
 *
 * It writes the SAME `_prisma_migrations` table and checksum (sha256 of migration.sql) that Prisma
 * uses, so a database migrated with this script is accepted later by the real `prisma migrate deploy`
 * (and vice versa). Each migration runs in one transaction, as the OWNER role (DIRECT_URL).
 *
 * Usage: npm run db:migrate:local            (uses DIRECT_URL)
 *        DIRECT_URL=... npm run db:migrate:local
 */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

export async function applyMigrations(connectionString: string, log = console.log): Promise<string[]> {
  const dir = path.resolve(import.meta.dirname, "../../prisma/migrations");
  const c = new pg.Client({ connectionString });
  await c.connect();
  const applied: string[] = [];
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0)`);
    const done = new Map<string, string>(
      (
        await c.query<{ migration_name: string; checksum: string }>(
          `SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
        )
      ).rows.map((r) => [r.migration_name, r.checksum]),
    );
    const names = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "migration.sql")))
      .map((d) => d.name)
      .sort();
    for (const name of names) {
      const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
      const sum = createHash("sha256").update(sql).digest("hex");
      if (done.has(name)) {
        if (done.get(name) !== sum) throw new Error(`migration ${name} was modified after it was applied`);
        continue;
      }
      const id = randomUUID();
      await c.query("BEGIN");
      try {
        await c.query(`INSERT INTO "_prisma_migrations" (id, checksum, migration_name) VALUES ($1, $2, $3)`, [
          id,
          sum,
          name,
        ]);
        await c.query(sql);
        await c.query(`UPDATE "_prisma_migrations" SET finished_at = now(), applied_steps_count = 1 WHERE id = $1`, [
          id,
        ]);
        await c.query("COMMIT");
        applied.push(name);
        log(`applied ${name}`);
      } catch (e) {
        await c.query("ROLLBACK");
        throw new Error(`migration ${name} failed: ${(e as Error).message}`);
      }
    }
    log("migrations up to date");
  } finally {
    await c.end();
  }
  return applied;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("DIRECT_URL is required (owner/migrator role)");
  applyMigrations(url).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
