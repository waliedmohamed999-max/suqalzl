import { readFileSync, statSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import pg from "pg";

const LOG = ".e2e/server.log";

/** Byte offset of the dev-server log, so we only look at OTPs sent after this point. */
export function logOffset(): number {
  try {
    return statSync(LOG).size;
  } catch {
    return 0;
  }
}

/**
 * Reads the 6-digit code the console SMS driver printed for `phone` after `offset`
 * (line: [sms:console] to=+9665******67 text="…: 123456").
 */
export async function otpFromLog(phone: string, offset: number): Promise<string> {
  const masked = `${phone.slice(0, 5)}******${phone.slice(-2)}`;
  let code: string | null = null;
  await expect
    .poll(
      () => {
        const text = readFileSync(LOG).subarray(offset).toString("utf8");
        const lines = text.split("\n").filter((l) => l.includes("[sms:console]") && l.includes(`to=${masked}`));
        const m = lines.at(-1)?.match(/(\d{6})/);
        code = m?.[1] ?? null;
        return code;
      },
      { timeout: 20_000, message: `OTP for ${masked} in ${LOG}` },
    )
    .not.toBeNull();
  return code!;
}

/** Random Saudi mobile (+9665XXXXXXXX), so repeated runs don't hit the per-phone rate limit. */
export function randomPhone(): string {
  return `+9665${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

/** Rate limits are per IP (5 OTP/hour): give each test its own client IP (dev server trusts XFF until P7). */
export async function freshIp(page: Page) {
  const ip = `10.${rand()}.${rand()}.${rand()}`;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
}
const rand = () => Math.floor(Math.random() * 254) + 1;

async function asSystem<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.role', 'system', true)");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    await c.end();
  }
}

/** Staff login is limited per e-mail (10 / 15 min): reset it so repeated local runs stay green. */
export async function resetStaffLoginLimit(email: string) {
  await asSystem((c) =>
    c.query("DELETE FROM rate_limit_buckets WHERE key = $1", [`staff-login:${email.toLowerCase()}`]),
  );
}

/** Toggle a Setting as the `system` RLS role (tests only). */
export async function setSetting(key: string, value: unknown) {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.role', 'system', true)");
    const r = await c.query("UPDATE settings SET value = $2::jsonb WHERE key = $1", [key, JSON.stringify(value)]);
    if (r.rowCount !== 1) throw new Error(`setting ${key} not found (run the seed)`);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    await c.end();
  }
}

export function superAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const phone = process.env.SUPER_ADMIN_PHONE;
  if (!email || !password) throw new Error("SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD must be set (seeded admin)");
  return { email, password, phone: phone || null };
}
