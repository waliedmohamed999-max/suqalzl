import "dotenv/config";
import { resetDatabase } from "../scripts/db/reset-db";

/**
 * Fresh test database for every run: drop app schemas, restore grants, apply all migrations
 * (scripts/db/apply-migrations.ts writes the same _prisma_migrations as `prisma migrate deploy`).
 * Without TEST_DIRECT_URL only the pure unit tests can run.
 */
export default async function setup() {
  const url = process.env.TEST_DIRECT_URL;
  if (!url) {
    console.warn("[tests] TEST_DIRECT_URL not set: database tests will fail");
    return;
  }
  await resetDatabase(url, { log: (s) => console.log(`[tests] ${s}`) });
}
