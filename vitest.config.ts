import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(import.meta.dirname, "src") };

/**
 * Two projects:
 *  - "node": unit + Postgres tests (backend, unchanged: one fresh test DB per run, files serial)
 *  - "ui":   component tests (frontend, P1-02) in jsdom with Testing Library; no database
 */
export default defineConfig({
  resolve: { alias },
  test: {
    // DB tests share one database: run files one at a time (tests inside a file may run concurrently).
    // A root-only option in Vitest 3, so it also applies to the (fast) ui project.
    fileParallelism: false,
    projects: [
      {
        // "server-only" throws outside the React server runtime; service modules import it.
        resolve: {
          alias: { ...alias, "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") },
        },
        test: {
          name: "node",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
          setupFiles: ["tests/setup-env.ts"],
          globalSetup: ["tests/global-setup.ts"],
          testTimeout: 60_000,
          hookTimeout: 240_000,
        },
      },
      {
        resolve: { alias },
        esbuild: { jsx: "automatic" },
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/components/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/components/setup.ts"],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
