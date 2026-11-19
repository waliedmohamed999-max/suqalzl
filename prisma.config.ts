import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI config (Prisma 7).
 * - Migrations run as the schema OWNER role (DIRECT_URL = suqalzl_migrator), never as the app role.
 * - The running app connects with DATABASE_URL (app role, RLS applies) through src/lib/db.ts.
 * - The seed connects as the APP role in a `system` context (FORCE RLS applies to the owner too).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "postgresql://invalid:invalid@127.0.0.1:1/invalid",
    // Prisma 7 has no --shadow-database-url flag: `prisma migrate diff --from-migrations` and
    // `migrate dev` read the shadow database from here (devops review P1-3). Owner role, throwaway DB.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
