import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (P1-02): login flows + axe (SPEC §10 E2E 6) against `next dev` on the database in .env
 * (local docker compose / any Postgres with migrations + seed). The dev server log is written to
 * .e2e/server.log so tests can read OTPs printed by the console SMS driver (SMS_PROVIDER=console).
 * Browser: Playwright's Chromium (`npx playwright install chromium`), or a local Chrome via
 * PLAYWRIGHT_CHROMIUM_PATH.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  // next dev compiles routes on first hit (cold API routes can take >15 s on CI-sized machines)
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    locale: "ar-SA",
    timezoneId: "Asia/Riyadh",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `mkdir -p .e2e && npx next dev -p ${PORT} > .e2e/server.log 2>&1`,
    url: `${BASE}/api/health`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { APP_URL: BASE, NEXT_PUBLIC_APP_URL: BASE, AUTH_URL: BASE, SMS_PROVIDER: "console" },
  },
});
