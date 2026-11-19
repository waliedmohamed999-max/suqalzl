import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { POST as otpRequestPOST } from "@/app/api/auth/otp/request/route";
import { POST as otpVerifyPOST } from "@/app/api/auth/otp/verify/route";
import { GET as sessionGET } from "@/app/api/auth/session/route";
import { POST as twoFaPOST } from "@/app/api/auth/staff/2fa/verify/route";
import { POST as staffLoginPOST } from "@/app/api/auth/staff/login/route";
import { POST as staffOtpRequestPOST } from "@/app/api/auth/staff/otp/request/route";
import { POST as staffOtpVerifyPOST } from "@/app/api/auth/staff/otp/verify/route";
import { hashPassword } from "@/lib/auth/password";
import { resolveSession } from "@/lib/auth/session";
import { withCtx } from "@/lib/db";
import { ConsoleSmsProvider } from "@/lib/providers/sms/console";
import { setSmsProvider } from "@/lib/providers/sms";
import { ownerQuery, randomPhone, SYS, truncateAll } from "./helpers";

/**
 * Auth end-to-end through the real Route Handlers (in-process) on real Postgres:
 * SPEC §9 OTP rules, D20, D31 (password + optional 2FA, one login method), server sessions.
 */
const ORIGIN = "http://localhost:3000";
const sms = new ConsoleSmsProvider();
let ipCounter = 0;
const nextIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

function post(
  handler: (r: Request) => Promise<Response>,
  body: unknown,
  opts: { cookie?: string; origin?: string | null; ip?: string } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": opts.ip ?? nextIp(),
  };
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  if (opts.cookie) headers.cookie = opts.cookie;
  return handler(new Request(`${ORIGIN}/api/x`, { method: "POST", headers, body: JSON.stringify(body) }));
}
const json = async (r: Response) => (await r.json()) as Record<string, unknown> & { error?: { code: string } };
const cookieOf = (r: Response, name = "szl_session") => {
  const m = new RegExp(`${name}=([^;]+)`).exec(r.headers.get("set-cookie") ?? "");
  return m ? m[1]! : null;
};
const lastCode = (phone: string) => [...sms.sent].reverse().find((m) => m.to === phone)!.vars.code!;
async function setSetting(key: string, value: unknown) {
  await withCtx(SYS, (tx) =>
    tx.setting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } }),
  );
}
async function session(token: string | null) {
  return json(
    await sessionGET(
      new Request(`${ORIGIN}/api/auth/session`, { headers: token ? { cookie: `szl_session=${token}` } : {} }),
    ),
  );
}

let adminEmail: string;
let adminPhone: string;
let ownerEmail: string;
let vendorId: string;
const PASSWORD = "very-secret-password-1";

beforeAll(async () => {
  await truncateAll();
  setSmsProvider(sms);
  adminEmail = "admin@test.local";
  adminPhone = randomPhone();
  ownerEmail = "owner@test.local";
  const hash = await hashPassword(PASSWORD);
  await withCtx(SYS, async (tx) => {
    await tx.user.create({
      data: { name: "Admin", email: adminEmail, phone: adminPhone, passwordHash: hash, role: "SUPER_ADMIN" },
    });
    const owner = await tx.user.create({
      data: { name: "Owner", email: ownerEmail, phone: randomPhone(), passwordHash: hash, role: "VENDOR_OWNER" },
    });
    vendorId = (
      await tx.vendor.create({
        data: {
          ownerUserId: owner.id,
          storeNameAr: "متجر",
          storeNameEn: "Store",
          slug: `s-${Date.now()}`,
          legalName: "x",
          status: "APPROVED",
        },
      })
    ).id;
  });
});
afterAll(() => setSmsProvider(undefined));
beforeEach(async () => {
  await setSetting("staffLoginMethod", "PASSWORD");
  await setSetting("staffTwoFactorEnabled", false);
});

describe("customer phone + OTP (SPEC §9, D20)", () => {
  it("accepts only Saudi mobiles (+9665)", async () => {
    const r = await post(otpRequestPOST, { phone: "+971501234567", locale: "ar" });
    expect(r.status).toBe(400);
    expect((await json(r)).error?.code).toBe("INVALID_PHONE");
  });

  it("sends a 6-digit code, stores only an HMAC, verifies, creates the account and a server session", async () => {
    const phone = randomPhone();
    const local = `0${phone.slice(4)}`;
    const r = await post(otpRequestPOST, { phone: local, locale: "ar" });
    expect(r.status).toBe(200);
    expect(await json(r)).toEqual({ ok: true, expiresInSeconds: 300 });
    const code = lastCode(phone);
    expect(code).toMatch(/^\d{6}$/);
    const row = (
      await ownerQuery("SELECT code_hash, expires_at - created_at AS ttl FROM otp_challenges WHERE phone = $1", [phone])
    ).rows[0]!;
    expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.code_hash).not.toContain(code);

    const bad = await post(otpVerifyPOST, { phone, code: code === "000000" ? "111111" : "000000", locale: "ar" });
    expect(bad.status).toBe(400);
    expect((await json(bad)).error?.code).toBe("OTP_INVALID");

    // Arabic-Indic digits are accepted
    const arabic = code.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
    const ok = await post(otpVerifyPOST, { phone, code: arabic, locale: "ar" });
    expect(ok.status).toBe(200);
    const body = await json(ok);
    expect(body).toMatchObject({ ok: true, isNew: true, user: { role: "CUSTOMER" } });
    expect(body).not.toHaveProperty("token"); // web gets only the httpOnly cookie
    const setCookie = ok.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    const token = cookieOf(ok)!;
    expect(await session(token)).toMatchObject({ authenticated: true, area: "account", user: { role: "CUSTOMER" } });
    const stored = (await ownerQuery("SELECT token_hash FROM sessions")).rows.map((x) => x.token_hash);
    expect(stored).not.toContain(token); // only SHA-256 stored

    // a used code cannot be replayed
    const replay = await post(otpVerifyPOST, { phone, code, locale: "ar" });
    expect((await json(replay)).error?.code).toBe("OTP_EXPIRED");
  });

  it("5 wrong attempts lock the code; the 6th (even correct) is refused (plan P1-01 acceptance)", async () => {
    const phone = randomPhone();
    await post(otpRequestPOST, { phone, locale: "en" });
    const code = lastCode(phone);
    const wrong = code === "123456" ? "654321" : "123456";
    const codes: string[] = [];
    for (let i = 0; i < 5; i++)
      codes.push((await json(await post(otpVerifyPOST, { phone, code: wrong, locale: "en" }))).error!.code);
    expect(codes).toEqual(["OTP_INVALID", "OTP_INVALID", "OTP_INVALID", "OTP_INVALID", "OTP_LOCKED"]);
    const sixth = await post(otpVerifyPOST, { phone, code, locale: "en" });
    expect(sixth.status).toBe(423);
    expect((await json(sixth)).error?.code).toBe("OTP_LOCKED");
  });

  it("expired codes are refused", async () => {
    const phone = randomPhone();
    await post(otpRequestPOST, { phone, locale: "ar" });
    const code = lastCode(phone);
    await ownerQuery("UPDATE otp_challenges SET expires_at = now() - interval '1 second' WHERE phone = $1", [phone]);
    expect((await json(await post(otpVerifyPOST, { phone, code, locale: "ar" }))).error?.code).toBe("OTP_EXPIRED");
  });

  it("rate limit: phone+IP strict 5/h, IP 5/h across phones (SPEC §9, D36-2)", async () => {
    const phone = randomPhone();
    const ip = "198.51.100.20";
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await post(otpRequestPOST, { phone, locale: "ar" }, { ip })).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    const limited = await post(otpRequestPOST, { phone, locale: "ar" }, { ip });
    expect((await json(limited)).error).toMatchObject({ code: "RATE_LIMITED", retryAt: expect.any(String) });

    const ip2 = "203.0.113.7";
    const byIp: number[] = [];
    for (let i = 0; i < 6; i++)
      byIp.push((await post(otpRequestPOST, { phone: randomPhone(), locale: "ar" }, { ip: ip2 })).status);
    expect(byIp).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("concurrent requests cannot bypass the per-phone threshold (atomic upsert)", async () => {
    const phone = randomPhone();
    const res = await Promise.all(Array.from({ length: 14 }, () => post(otpRequestPOST, { phone, locale: "ar" })));
    expect(res.filter((r) => r.status === 200)).toHaveLength(10);
    expect(res.filter((r) => r.status === 428)).toHaveLength(4);
  });

  it("CSRF: cookie POST without our Origin is refused; strict input rejects extra keys", async () => {
    expect(
      (await post(otpRequestPOST, { phone: randomPhone(), locale: "ar" }, { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect((await post(otpRequestPOST, { phone: randomPhone(), locale: "ar" }, { origin: null })).status).toBe(403);
    const extra = await post(otpRequestPOST, { phone: randomPhone(), locale: "ar", role: "SUPER_ADMIN" });
    expect(extra.status).toBe(400);
    expect((await json(extra)).error?.code).toBe("VALIDATION");
  });

  it("a staff user logging in with the customer OTP gets a CUSTOMER session only (no staff powers)", async () => {
    await post(otpRequestPOST, { phone: adminPhone, locale: "ar" });
    const ok = await post(otpVerifyPOST, { phone: adminPhone, code: lastCode(adminPhone), locale: "ar" });
    expect(ok.status).toBe(200);
    const s = await session(cookieOf(ok));
    expect(s).toMatchObject({ authenticated: true, area: "account", permissions: [] });
  });

  it("logout revokes the session server-side; blocked users lose their session", async () => {
    const phone = randomPhone();
    await post(otpRequestPOST, { phone, locale: "ar" });
    const token = cookieOf(await post(otpVerifyPOST, { phone, code: lastCode(phone), locale: "ar" }))!;
    expect((await resolveSession(token))?.principal).not.toBeNull();
    const out = await post(logoutPOST, {}, { cookie: `szl_session=${token}` });
    expect(out.status).toBe(200);
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
    expect(await resolveSession(token)).toBeNull();

    await post(otpRequestPOST, { phone, locale: "ar" });
    const t2 = cookieOf(await post(otpVerifyPOST, { phone, code: lastCode(phone), locale: "ar" }))!;
    await ownerQuery("UPDATE users SET status = 'BLOCKED' WHERE phone = $1", [phone]);
    expect(await resolveSession(t2)).toBeNull();
  });
});

describe("staff & vendors (D31)", () => {
  it("password login: wrong password / unknown e-mail give the same 401; correct → admin area", async () => {
    const a = await post(staffLoginPOST, { email: adminEmail, password: "nope-nope-nope" });
    const b = await post(staffLoginPOST, { email: "ghost@test.local", password: "nope-nope-nope" });
    expect([a.status, b.status]).toEqual([401, 401]);
    expect((await json(a)).error?.code).toBe("INVALID_CREDENTIALS");
    expect((await json(b)).error?.code).toBe("INVALID_CREDENTIALS");

    const ok = await post(staffLoginPOST, { email: adminEmail.toUpperCase(), password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(await json(ok)).toEqual({ ok: true, requires2fa: false, area: "admin" });
    expect(await session(cookieOf(ok))).toMatchObject({
      authenticated: true,
      area: "admin",
      user: { role: "SUPER_ADMIN" },
    });
    const logs = await ownerQuery("SELECT action FROM audit_logs WHERE action LIKE 'auth.staff_login%'");
    expect(logs.rowCount).toBeGreaterThan(0);
  });

  it("vendor owner logs into the vendor area with vendorId from the session", async () => {
    const ok = await post(staffLoginPOST, { email: ownerEmail, password: PASSWORD });
    expect(await json(ok)).toEqual({ ok: true, requires2fa: false, area: "vendor" });
    expect(await session(cookieOf(ok))).toMatchObject({ area: "vendor", vendorId });
  });

  it("only ONE method is enabled: PHONE_OTP disables passwords and vice versa", async () => {
    await setSetting("staffLoginMethod", "PHONE_OTP");
    const pw = await post(staffLoginPOST, { email: adminEmail, password: PASSWORD });
    expect(pw.status).toBe(403);
    expect((await json(pw)).error?.code).toBe("LOGIN_METHOD_DISABLED");
    expect((await post(staffOtpRequestPOST, { phone: adminPhone })).status).toBe(200);
    const ok = await post(staffOtpVerifyPOST, { phone: adminPhone, code: lastCode(adminPhone) });
    expect(await json(ok)).toEqual({ ok: true, requires2fa: false, area: "admin" });
    // unknown phone: same 200, no SMS
    const before = sms.sent.length;
    const ghost = randomPhone();
    expect((await post(staffOtpRequestPOST, { phone: ghost })).status).toBe(200);
    expect(sms.sent.length).toBe(before);

    await setSetting("staffLoginMethod", "PASSWORD");
    const off = await post(staffOtpRequestPOST, { phone: adminPhone });
    expect((await json(off)).error?.code).toBe("LOGIN_METHOD_DISABLED");
  });

  it("2FA off by default; when enabled: pending session, OTP, rotation, 'remember this device 30 days'", async () => {
    await setSetting("staffTwoFactorEnabled", true);
    const login = await post(staffLoginPOST, { email: adminEmail, password: PASSWORD });
    expect(await json(login)).toEqual({ ok: true, requires2fa: true, area: "admin" });
    const pending = cookieOf(login)!;
    expect(await session(pending)).toMatchObject({ authenticated: false, requires2fa: true, area: null });

    const wrong = await post(twoFaPOST, { code: "000000", rememberDevice: true }, { cookie: `szl_session=${pending}` });
    expect([400, 423]).toContain(wrong.status);

    await post(staffLoginPOST, { email: adminEmail, password: PASSWORD }); // fresh pending session + code
    const pending2 = cookieOf(await post(staffLoginPOST, { email: adminEmail, password: PASSWORD }))!;
    const ok = await post(
      twoFaPOST,
      { code: lastCode(adminPhone), rememberDevice: true },
      { cookie: `szl_session=${pending2}` },
    );
    expect(ok.status).toBe(200);
    const full = cookieOf(ok)!;
    const device = cookieOf(ok, "szl_device")!;
    expect(full).not.toBe(pending2);
    expect(device).toBeTruthy();
    expect(ok.headers.get("set-cookie")).toMatch(/szl_device=[^;]+;.*Max-Age=2592000/i);
    expect(await session(full)).toMatchObject({ authenticated: true, area: "admin" });
    expect(await resolveSession(pending2)).toBeNull(); // pending session revoked (rotation)

    // trusted device: next login skips the second factor
    const again = await post(
      staffLoginPOST,
      { email: adminEmail, password: PASSWORD },
      { cookie: `szl_device=${device}` },
    );
    expect(await json(again)).toEqual({ ok: true, requires2fa: false, area: "admin" });
    // a pending session cannot be used by the 2FA endpoint without the cookie
    expect((await post(twoFaPOST, { code: "123456", rememberDevice: false })).status).toBe(401);
  });

  it("removing a vendor team member takes effect immediately", async () => {
    const hash = await hashPassword(PASSWORD);
    const email = "member@test.local";
    await withCtx(SYS, async (tx) => {
      const u = await tx.user.create({ data: { name: "M", email, passwordHash: hash, role: "VENDOR_STAFF" } });
      await tx.vendorMember.create({ data: { vendorId, userId: u.id, permissions: ["orders.fulfill"] } });
    });
    const ok = await post(staffLoginPOST, { email, password: PASSWORD });
    const token = cookieOf(ok)!;
    expect(await session(token)).toMatchObject({ area: "vendor", permissions: ["orders.fulfill"] });
    await ownerQuery("UPDATE vendor_members SET is_active = false WHERE vendor_id = $1", [vendorId]);
    expect(await session(token)).toMatchObject({ authenticated: false });
  });
});
