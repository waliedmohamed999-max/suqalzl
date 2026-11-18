import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // DB tests share one database: run files one at a time (tests inside a file may run concurrently).
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 240_000,
  },
});
