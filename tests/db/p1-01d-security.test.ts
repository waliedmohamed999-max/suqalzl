import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as challengePOST } from "@/app/api/auth/challenge/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { POST as otpRequestPOST } from "@/app/api/auth/otp/request/route";
import { POST as otpVerifyPOST } from "@/app/api/auth/otp/verify/route";
import { GET as sessionGET } from "@/app/api/auth/session/route";
import { POST as staffLoginPOST } from "@/app/api/auth/staff/login/route";
import { POST as twoFaPOST } from "@/app/api/auth/staff/2fa/verify/route";
import { POST as cronPOST } from "@/app/api/cron/[job]/route";
import { GET as streamGET } from "@/app/api/realtime/stream/route";
import { toPublicVendor, PUBLIC_VENDOR_SELECT } from "@/features/vendors/dto";
import { hashPassword } from "@/lib/auth/password";
import { getPrincipalFromRequest, resolveSession } from "@/lib/auth/session";
import { asSystem, withCtx } from "@/lib/db";
import { authorize, PermissionDeniedError, vendor } from "@/lib/permissions";
import { solvePow } from "@/lib/providers/captcha";
import { runWithLease } from "@/lib/providers/jobs/lease";
import { publish, realtime, topics } from "@/lib/providers/realtime";
import { ConsoleSmsProvider } from "@/lib/providers/sms/console";
import { setSmsProvider } from "@/lib/providers/sms";
import { getSetting } from "@/lib/settings";
import { ownerQuery, randomPhone, SYS, truncateAll } from "./helpers";
import { sse, type Fetcher, type SseConn } from "./sse-client";

/**
 * P1-01d regression tests (D36, docs/reviews/qa-p1-01.md, docs/reviews/devops-p1-01.md):
 * QA-B1, B2, B3, B4, B5, B6, B8, B10, vendors omit/DTO, asSystem, cron lease, resync.
 * Through the real Route Handlers, in-process, on real Postgres.
 */
const ORIGIN = "http://localhost:3000";
const sms = new ConsoleSmsProvider();
let ipN = 0;
const nextIp = () => `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`;
const fetcher: Fetcher = (url, init) => streamGET(new Request(url, init));
const streams: SseConn[] = [];
const track = (c: SseConn) => (streams.push(c), c);

function post(
  handler: (r: Request) => Promise<Response>,
  body: unknown,
  opts: { cookie?: string; ip?: string; xff?: string } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: ORIGIN,
    "x-forwarded-for": opts.xff ?? opts.ip ?? nextIp(),
  };
  if (opts.cookie) headers.cookie = opts.cookie;
  return handler(new Request(`${ORIGIN}/api/x`, { method: "POST", headers, body: JSON.stringify(body) }));
}
const json = async (r: Response) => (await r.json()) as Record<string, unknown> & { error?: { code: string } };
const cookieOf = (r: Response, name = "szl_session") =>
  new RegExp(`${name}=([^;]+)`).exec(r.headers.get("set-cookie") ?? "")?.[1] ?? null;
const lastCode = (phone: string) => [...sms.sent].reverse().find((m) => m.to === phone)!.vars.code!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function setSetting(key: string, value: unknown) {
  await withCtx(SYS, (tx) =>
    tx.setting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } }),
  );
}
async function deleteSetting(key: string) {
  await ownerQuery("DELETE FROM settings WHERE key = $1", [key]);
}
async function solvedChallenge() {
  const c = (await (await post(challengePOST, {})).json()) as { token: string; difficultyBits: number };
  return { token: c.token, solution: solvePow(c.token, c.difficultyBits) };
}
async function customerLogin(phone = randomPhone()) {
  await post(otpRequestPOST, { phone, locale: "ar" });
  const r = await post(otpVerifyPOST, { phone, code: lastCode(phone), locale: "ar" });
  const token = cookieOf(r)!;
  return { phone, token, userId: (await resolveSession(token))!.userId };
}

const PASSWORD = "very-secret-password-1";
let adminEmail: string;
let adminPhone: string;
let adminId: string;

beforeAll(async () => {
  await truncateAll();
  setSmsProvider(sms);
  adminEmail = "admin-d@test.local";
  adminPhone = randomPhone();
  const hash = await hashPassword(PASSWORD);
  adminId = await withCtx(SYS, async (tx) => {
    const u = await tx.user.create({
      data: { name: "Admin", email: adminEmail, phone: adminPhone, passwordHash: hash, role: "SUPER_ADMIN" },
    });
    return u.id;
  });
  // small difficulty: the protocol is what is tested, not the CPU cost
  await setSetting("captcha", { provider: "POW", powDifficultyBits: 8, ttlSeconds: 300 });
});
beforeEach(async () => {
  await setSetting("staffLoginMethod", "PASSWORD");
  await setSetting("staffTwoFactorEnabled", false);
});
afterAll(async () => {
  for (const c of streams) c.close();
  setSmsProvider(undefined);
  await realtime().close();
});

// ================================================================================================ QA-B1
describe("QA-B1: client IP from the trusted proxy only + global SMS budget", () => {
  it("rotating a forged X-Forwarded-For prefix does not create new IP buckets", async () => {
    const realIp = "198.51.100.99"; // what OUR proxy appends (TRUSTED_PROXY_HOPS = 1 in tests)
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const forged = `1.2.3.${i}, 4.5.6.${i}`;
      statuses.push(
        (await post(otpRequestPOST, { phone: randomPhone(), locale: "ar" }, { xff: `${forged}, ${realIp}` })).status,
      );
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429]);
  });

  it("platform-wide SMS budget per hour stops the flood (distinct phones, distinct IPs)", async () => {
    await ownerQuery("DELETE FROM rate_limit_buckets WHERE key = 'sms:global:customer'");
    await setSetting("smsBudget", { customerPerHour: 3, staffPerHour: 60 });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const st: number[] = [];
      for (let i = 0; i < 5; i++) st.push((await post(otpRequestPOST, { phone: randomPhone(), locale: "ar" })).status);
      expect(st).toEqual([200, 200, 200, 429, 429]);
      expect(err.mock.calls.some((c) => String(c[0]).includes("global SMS budget"))).toBe(true);
    } finally {
      err.mockRestore();
      await deleteSetting("smsBudget");
      await ownerQuery("DELETE FROM rate_limit_buckets WHERE key = 'sms:global:customer'");
    }
  });
});

// ================================================================================================ QA-B2
describe("QA-B2: the 2FA OTP is under the per-phone limit", () => {
  it("9 password logins with 2FA → only 5 SMS to the admin phone, then 429", async () => {
    await setSetting("staffTwoFactorEnabled", true);
    const before = sms.sent.filter((m) => m.to === adminPhone).length;
    const st: number[] = [];
    for (let i = 0; i < 9; i++) st.push((await post(staffLoginPOST, { email: adminEmail, password: PASSWORD })).status);
    expect(st).toEqual([200, 200, 200, 200, 200, 429, 429, 429, 429]);
    expect(sms.sent.filter((m) => m.to === adminPhone).length - before).toBe(5);
    await ownerQuery("DELETE FROM rate_limit_buckets WHERE key LIKE 'otp:STAFF_2FA:%' OR key LIKE 'otp:phone-day:%'");
  });
});

// ================================================================================================ QA-B3
describe("QA-B3 / D36-1: revoking a session closes its SSE streams", () => {
  it("logout → `event: revoked` and the stream is closed within 2 s", async () => {
    const c = await customerLogin();
    const s = track(await sse(fetcher, [topics.user(c.userId)], { token: c.token }));
    await s.waitFor((e) => e.event === "ready");
    const t0 = performance.now();
    expect((await post(logoutPOST, {}, { cookie: `szl_session=${c.token}` })).status).toBe(200);
    await s.waitFor((e) => e.event === "revoked", 2000);
    expect(performance.now() - t0).toBeLessThan(2000);
    await sleep(50);
    expect(s.ended).toBe(true);
  });

  it("blocking a user closes ALL of their streams (every session)", async () => {
    const phone = randomPhone();
    const a = await customerLogin(phone);
    const b = await customerLogin(phone); // second device
    const other = await customerLogin();
    const s1 = track(await sse(fetcher, [topics.user(a.userId)], { token: a.token }));
    const s2 = track(await sse(fetcher, ["souq", topics.user(b.userId)], { token: b.token }));
    const s3 = track(await sse(fetcher, [topics.user(other.userId)], { token: other.token }));
    await Promise.all([s1, s2, s3].map((s) => s.waitFor((e) => e.event === "ready")));
    await ownerQuery("UPDATE users SET status = 'BLOCKED' WHERE id = $1", [a.userId]);
    await s1.waitFor((e) => e.event === "revoked", 2000);
    await s2.waitFor((e) => e.event === "revoked", 2000);
    await sleep(300);
    expect(s3.events.some((e) => e.event === "revoked")).toBe(false);
    expect(s3.ended).toBe(false);
  });

  it("deactivating a vendor team member closes that member's vendor stream", async () => {
    const { token, vendorId } = await withCtx(SYS, async (tx) => {
      const o = await tx.user.create({ data: { name: "O", phone: randomPhone(), role: "VENDOR_OWNER" } });
      const m = await tx.user.create({ data: { name: "M", phone: randomPhone(), role: "VENDOR_STAFF" } });
      const v = await tx.vendor.create({
        data: {
          ownerUserId: o.id,
          storeNameAr: "م",
          storeNameEn: "S",
          slug: `m-${Date.now()}`,
          legalName: "x",
          status: "APPROVED",
        },
      });
      await tx.vendorMember.create({ data: { vendorId: v.id, userId: m.id, permissions: ["orders.fulfill"] } });
      const { createSession } = await import("@/lib/auth/session");
      const s = await createSession(tx, { userId: m.id, scope: "VENDOR", vendorId: v.id });
      return { token: s.token, vendorId: v.id };
    });
    const s = track(await sse(fetcher, [topics.vendorInbox(vendorId)], { token }));
    await s.waitFor((e) => e.event === "ready");
    await ownerQuery("UPDATE vendor_members SET is_active = false WHERE vendor_id = $1", [vendorId]);
    await s.waitFor((e) => e.event === "revoked", 2000);
  });

  it("fallback: the periodic re-check closes a stream whose topics are no longer allowed (no NOTIFY)", async () => {
    process.env.REALTIME_REVALIDATE_SECONDS = "1";
    try {
      const { token, vendorId } = await withCtx(SYS, async (tx) => {
        const o = await tx.user.create({ data: { name: "O", phone: randomPhone(), role: "VENDOR_OWNER" } });
        const v = await tx.vendor.create({
          data: {
            ownerUserId: o.id,
            storeNameAr: "م",
            storeNameEn: "S",
            slug: `r-${Date.now()}`,
            legalName: "x",
            status: "APPROVED",
          },
        });
        const { createSession } = await import("@/lib/auth/session");
        return {
          token: (await createSession(tx, { userId: o.id, scope: "VENDOR", vendorId: v.id })).token,
          vendorId: v.id,
        };
      });
      const s = track(await sse(fetcher, [topics.vendorInbox(vendorId)], { token }));
      await s.waitFor((e) => e.event === "ready");
      // a status change revokes no session, but PENDING may not read the inbox (D36-3)
      await ownerQuery("UPDATE vendors SET status = 'PENDING' WHERE id = $1", [vendorId]);
      await s.waitFor((e) => e.event === "revoked", 3000);
    } finally {
      delete process.env.REALTIME_REVALIDATE_SECONDS;
    }
  });

  it("the control message carries ids only (no token, no hash)", async () => {
    const c = await customerLogin();
    const pg = await import("pg");
    const l = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
    await l.connect();
    const got: string[] = [];
    l.on("notification", (n) => n.channel === "realtime_ctl" && got.push(n.payload ?? ""));
    await l.query("LISTEN realtime_ctl");
    await post(logoutPOST, {}, { cookie: `szl_session=${c.token}` });
    await sleep(300);
    await l.end();
    expect(got).toHaveLength(1);
    expect(Object.keys(JSON.parse(got[0]!)).sort()).toEqual(["sessionId", "type", "userId"]);
    expect(got[0]).not.toContain(c.token);
  });
});

// ================================================================================================ QA-B4
describe("QA-B4: blocking revokes every session and trusted device; unblocking restores none", () => {
  it("BLOCKED → ACTIVE does not bring the old session or the trusted device back", async () => {
    await setSetting("staffTwoFactorEnabled", true);
    const email = `b4-${Date.now()}@test.local`;
    const phone = randomPhone();
    const id = await withCtx(
      SYS,
      async (tx) =>
        (
          await tx.user.create({
            data: {
              name: "S",
              email,
              phone,
              passwordHash: await hashPassword(PASSWORD),
              role: "STAFF",
              permissions: ["orders.manage"],
            },
          })
        ).id,
    );
    const pending = cookieOf(await post(staffLoginPOST, { email, password: PASSWORD }))!;
    const ok = await post(
      twoFaPOST,
      { code: lastCode(phone), rememberDevice: true },
      { cookie: `szl_session=${pending}` },
    );
    const token = cookieOf(ok)!;
    const device = cookieOf(ok, "szl_device")!;
    expect((await resolveSession(token))?.principal).not.toBeNull();

    await ownerQuery("UPDATE users SET status = 'BLOCKED' WHERE id = $1", [id]);
    await ownerQuery("UPDATE users SET status = 'ACTIVE' WHERE id = $1", [id]);
    expect(await resolveSession(token)).toBeNull();
    const devices = await ownerQuery<{ revoked_at: Date | null }>(
      "SELECT revoked_at FROM trusted_devices WHERE user_id = $1",
      [id],
    );
    expect(devices.rows.every((d) => d.revoked_at !== null)).toBe(true);
    // the old device cookie no longer skips 2FA
    const again = await post(staffLoginPOST, { email, password: PASSWORD }, { cookie: `szl_device=${device}` });
    expect(await json(again)).toMatchObject({ requires2fa: true });
  });

  it("role / permission / password changes revoke the sessions too (D36-1)", async () => {
    const id = await withCtx(
      SYS,
      async (tx) =>
        (
          await tx.user.create({
            data: {
              name: "S2",
              email: `p-${Date.now()}@t.local`,
              passwordHash: await hashPassword(PASSWORD),
              role: "STAFF",
              permissions: ["orders.manage"],
            },
          })
        ).id,
    );
    const { createSession } = await import("@/lib/auth/session");
    for (const change of [
      "UPDATE users SET permissions = ARRAY['reports.view'] WHERE id = $1",
      "UPDATE users SET role = 'CUSTOMER', phone = '+966500000001' WHERE id = $1",
      "UPDATE users SET password_hash = 'x' WHERE id = $1",
    ]) {
      const t = await withCtx(SYS, (tx) => createSession(tx, { userId: id, scope: "STAFF" }));
      await ownerQuery(change, [id]);
      const row = await ownerQuery<{ revoked_at: Date | null }>("SELECT revoked_at FROM sessions WHERE id = $1", [
        t.sessionId,
      ]);
      expect([change, row.rows[0]!.revoked_at !== null]).toEqual([change, true]);
    }
  });
});

// ================================================================================================ QA-B5
describe("QA-B5 / D36-2: guessing cannot lock an account", () => {
  it("(a) e-mail + IP strict: the attacker's IP is refused, the owner from another IP gets in", async () => {
    const attacker = "203.0.113.50";
    for (let i = 0; i < 5; i++)
      expect(
        (await post(staffLoginPOST, { email: adminEmail, password: "wrong-wrong-1" }, { ip: attacker })).status,
      ).toBe(401);
    const blocked = await post(staffLoginPOST, { email: adminEmail, password: PASSWORD }, { ip: attacker });
    expect(blocked.status).toBe(429);
    const owner = await post(staffLoginPOST, { email: adminEmail, password: PASSWORD }, { ip: "198.51.100.1" });
    expect(owner.status).toBe(200);
  });

  it("(a) is reset by a success", async () => {
    const ip = "203.0.113.51";
    for (let i = 0; i < 4; i++) await post(staffLoginPOST, { email: adminEmail, password: "wrong-wrong-1" }, { ip });
    expect((await post(staffLoginPOST, { email: adminEmail, password: PASSWORD }, { ip })).status).toBe(200);
    for (let i = 0; i < 4; i++)
      expect((await post(staffLoginPOST, { email: adminEmail, password: "wrong-wrong-1" }, { ip })).status).toBe(401);
    expect((await post(staffLoginPOST, { email: adminEmail, password: PASSWORD }, { ip })).status).toBe(200);
  });

  it("(b) distributed guessing → challenge (never a lock); trusted device or solved PoW gets in; alert logged", async () => {
    const email = `b5-${Date.now()}@test.local`;
    const phone = randomPhone();
    const id = await withCtx(
      SYS,
      async (tx) =>
        (
          await tx.user.create({
            data: { name: "V", email, phone, passwordHash: await hashPassword(PASSWORD), role: "SUPER_ADMIN" },
          })
        ).id,
    );
    // owner's trusted device from an earlier 2FA login
    await setSetting("staffTwoFactorEnabled", true);
    const pending = cookieOf(await post(staffLoginPOST, { email, password: PASSWORD }))!;
    const device = cookieOf(
      await post(twoFaPOST, { code: lastCode(phone), rememberDevice: true }, { cookie: `szl_session=${pending}` }),
      "szl_device",
    )!;
    await setSetting("staffTwoFactorEnabled", false);

    for (let i = 0; i < 20; i++) await post(staffLoginPOST, { email, password: `guess-${i}-xxxx` }); // 20 IPs
    const plain = await post(staffLoginPOST, { email, password: PASSWORD });
    expect(plain.status).toBe(428);
    expect((await json(plain)).error?.code).toBe("CHALLENGE_REQUIRED");
    // wrong password without challenge: the SAME 428 (no password oracle)
    expect((await post(staffLoginPOST, { email, password: "nope-nope-nope" })).status).toBe(428);

    const trusted = await post(staffLoginPOST, { email, password: PASSWORD }, { cookie: `szl_device=${device}` });
    expect(trusted.status).toBe(200);
    const pow = await solvedChallenge();
    expect((await post(staffLoginPOST, { email, password: PASSWORD, captcha: pow })).status).toBe(200);
    // a challenge token is single-use
    expect((await post(staffLoginPOST, { email, password: PASSWORD, captcha: pow })).status).toBe(428);

    const alerts = await ownerQuery(
      "SELECT 1 FROM audit_logs WHERE action = 'security.login_challenge_threshold' AND entity_id = $1",
      [id],
    );
    expect(alerts.rowCount).toBe(1);
  });

  it("(b) unknown e-mails behave exactly the same (no account oracle)", async () => {
    const ghost = `ghost-${Date.now()}@test.local`;
    for (let i = 0; i < 20; i++) await post(staffLoginPOST, { email: ghost, password: `guess-${i}-xxxx` });
    expect((await post(staffLoginPOST, { email: ghost, password: PASSWORD })).status).toBe(428);
  });

  it("customer OTP: phone alone → challenge after 10/h; PoW passes; absolute 20/day per phone", async () => {
    const phone = randomPhone();
    const st: number[] = [];
    for (let i = 0; i < 11; i++) st.push((await post(otpRequestPOST, { phone, locale: "ar" })).status);
    expect(st).toEqual([...Array(10).fill(200), 428]);
    expect((await post(otpRequestPOST, { phone, locale: "ar", captcha: await solvedChallenge() })).status).toBe(200);
    // forged/garbage answers are refused
    expect(
      (await post(otpRequestPOST, { phone, locale: "ar", captcha: { token: "x".repeat(20), solution: "1" } })).status,
    ).toBe(428);

    // refused requests (428) did not spend the daily budget: 11 sent so far
    for (let i = 0; i < 9; i++)
      expect((await post(otpRequestPOST, { phone, locale: "ar", captcha: await solvedChallenge() })).status).toBe(200);
    const over = await post(otpRequestPOST, { phone, locale: "ar", captcha: await solvedChallenge() });
    expect(over.status).toBe(429); // 21st today
  });
});

// ================================================================================================ QA-B6
describe("QA-B6: security settings fail closed", () => {
  it("an invalid staffTwoFactorEnabled turns 2FA ON and logs an error", async () => {
    await setSetting("staffTwoFactorEnabled", "no");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const r = await post(staffLoginPOST, { email: adminEmail, password: PASSWORD });
      expect(await json(r)).toMatchObject({ requires2fa: true });
      expect(err.mock.calls.some((c) => String(c[0]).includes('"staffTwoFactorEnabled"'))).toBe(true);
      expect(err.mock.calls.some((c) => String(c[0]).includes("no"))).toBe(false); // value never logged
    } finally {
      err.mockRestore();
      await ownerQuery("DELETE FROM rate_limit_buckets WHERE key LIKE 'otp:%'");
    }
  });

  it("other security keys fall back to their strict values; a missing row is just the default", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await setSetting("otp", { ttlSeconds: "forever" });
      await setSetting("trustedDeviceDays", -5);
      await withCtx(SYS, async (tx) => {
        expect((await getSetting(tx, "otp")).maxAttempts).toBe(5);
        expect(await getSetting(tx, "trustedDeviceDays")).toBe(1);
      });
      await deleteSetting("staffTwoFactorEnabled");
      await withCtx(SYS, async (tx) => expect(await getSetting(tx, "staffTwoFactorEnabled")).toBe(false));
    } finally {
      err.mockRestore();
      await deleteSetting("otp");
      await deleteSetting("trustedDeviceDays");
    }
  });
});

// ================================================================================================ QA-B8
describe("QA-B8 / D36-3: store status enforced centrally from the database", () => {
  it("SUSPENDED store: fulfil existing orders yes, products no; REJECTED owner can still log in", async () => {
    const email = `v8-${Date.now()}@test.local`;
    const vendorId = await withCtx(SYS, async (tx) => {
      const o = await tx.user.create({
        data: {
          name: "O",
          email,
          phone: randomPhone(),
          passwordHash: await hashPassword(PASSWORD),
          role: "VENDOR_OWNER",
        },
      });
      return (
        await tx.vendor.create({
          data: {
            ownerUserId: o.id,
            storeNameAr: "م",
            storeNameEn: "S",
            slug: `v8-${Date.now()}`,
            legalName: "x",
            status: "APPROVED",
          },
        })
      ).id;
    });
    const token = cookieOf(await post(staffLoginPOST, { email, password: PASSWORD }))!;
    const req = () => new Request(`${ORIGIN}/api/x`, { headers: { cookie: `szl_session=${token}` } });

    await ownerQuery("UPDATE vendors SET status = 'SUSPENDED' WHERE id = $1", [vendorId]);
    const p = await getPrincipalFromRequest(req());
    expect(p).toMatchObject({ kind: "vendor", vendorStatus: "SUSPENDED" });
    expect(authorize(p, vendor("orders.fulfill")).ctx).toMatchObject({ kind: "vendor", vendorId });
    expect(() => authorize(p, vendor("products.manage"))).toThrow(PermissionDeniedError);
    expect(() => authorize(p, vendor("vendor.bank.manage"))).toThrow(PermissionDeniedError);

    await ownerQuery("UPDATE vendors SET status = 'REJECTED' WHERE id = $1", [vendorId]);
    const login = await post(staffLoginPOST, { email, password: PASSWORD });
    expect(await json(login)).toMatchObject({ ok: true, area: "vendor" });
    const s = (await (
      await sessionGET(
        new Request(`${ORIGIN}/api/auth/session`, { headers: { cookie: `szl_session=${cookieOf(login)}` } }),
      )
    ).json()) as Record<string, unknown>;
    expect(s).toMatchObject({ area: "vendor", vendorStatus: "REJECTED" });
    const pr = await getPrincipalFromRequest(req());
    expect(authorize(pr, vendor("vendor.application.manage")).principal).toBeTruthy();
    expect(() => authorize(pr, vendor("vendor.read"))).toThrow(PermissionDeniedError);
  });
});

// ================================================================================================ QA-B10
describe("QA-B10: names are cleaned and limited on the server", () => {
  it("HTML, control/bidi characters and formula prefixes are stripped; 80 code points max", async () => {
    const phone = randomPhone();
    await post(otpRequestPOST, { phone, locale: "ar" });
    const r = await post(otpVerifyPOST, {
      phone,
      code: lastCode(phone),
      locale: "ar",
      name: "=<script>alert(1)</script>  أحمد‮\u0000 <b>الزل</b>",
    });
    expect(r.status).toBe(200);
    const row = await ownerQuery<{ name: string }>("SELECT name FROM users WHERE phone = $1", [phone]);
    expect(row.rows[0]!.name).toBe("alert(1) أحمد الزل");

    const phone2 = randomPhone();
    await post(otpRequestPOST, { phone: phone2, locale: "ar" });
    await post(otpVerifyPOST, { phone: phone2, code: lastCode(phone2), locale: "ar", name: "ز".repeat(300) });
    const row2 = await ownerQuery<{ name: string }>("SELECT name FROM users WHERE phone = $1", [phone2]);
    expect([...row2.rows[0]!.name]).toHaveLength(80);
  });
});

// ================================================================================================ vendors
describe("D36-6: sensitive vendor columns are omitted; public reads use PublicVendorDTO", () => {
  it("a plain read returns none of the legal/bank/address columns; the DTO is strict", async () => {
    await withCtx(SYS, async (tx) => {
      const o = await tx.user.create({ data: { name: "O", phone: randomPhone(), role: "VENDOR_OWNER" } });
      await tx.vendor.create({
        data: {
          ownerUserId: o.id,
          storeNameAr: "متجر",
          storeNameEn: "Store",
          slug: `pub-${Date.now()}`,
          legalName: "LEGAL-NAME-SECRET",
          crNumber: "1010101010",
          bankName: "BANK-SECRET",
          accountHolderName: "HOLDER-SECRET",
          pickupAddress: { street: "STREET-SECRET" },
          status: "APPROVED",
        },
      });
    });
    const plain = await withCtx({ kind: "public" }, (tx) => tx.vendor.findMany({ include: { city: true } }));
    const text = JSON.stringify(plain);
    for (const s of ["LEGAL-NAME-SECRET", "1010101010", "BANK-SECRET", "HOLDER-SECRET", "STREET-SECRET"])
      expect(text).not.toContain(s);
    for (const k of [
      "legalName",
      "crNumber",
      "freelanceDocNumber",
      "vatNumber",
      "bankName",
      "accountHolderName",
      "pickupAddress",
      "iban",
    ])
      expect(Object.keys(plain[0]!)).not.toContain(k);

    const rows = await withCtx({ kind: "public" }, (tx) => tx.vendor.findMany({ select: PUBLIC_VENDOR_SELECT }));
    const dto = toPublicVendor(rows[0]!);
    expect(Object.keys(dto)).not.toContain("ownerUserId");
    expect(() => toPublicVendor({ ...rows[0]!, legalName: "x" } as never)).toThrow();
  });
});

// ================================================================================================ asSystem
describe("asSystem (devops review P1-8)", () => {
  it("a database error inside keeps its ORIGINAL message (not 'current transaction is aborted')", async () => {
    const err = await withCtx({ kind: "customer", userId: adminId }, (tx) =>
      asSystem(tx, { kind: "customer", userId: adminId }, () => tx.$queryRaw`SELECT 1 / 0`),
    ).catch((e: unknown) => e as Error);
    expect(String((err as Error).message)).toMatch(/division by zero/);
    expect(String((err as Error).message)).not.toMatch(/current transaction is aborted/);
  });

  it("a JS error inside restores the caller role before the caller continues", async () => {
    const role = await withCtx({ kind: "customer", userId: adminId }, async (tx) => {
      await asSystem(tx, { kind: "customer", userId: adminId }, async () => {
        throw new Error("boom");
      }).catch(() => {});
      return (await tx.$queryRaw<{ r: string }[]>`SELECT current_setting('app.role') AS r`)[0]!.r;
    });
    expect(role).toBe("customer");
  });
});

// ================================================================================================ cron
describe("cron lease + heartbeat (devops review P1-5/P1-6)", () => {
  const cron = (job: string) =>
    cronPOST(
      new Request(`${ORIGIN}/api/cron/${job}`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
      { params: Promise.resolve({ job }) },
    );

  it("parallel runs: exactly one holds the lease; the route reports status columns", async () => {
    let running = 0;
    let maxRunning = 0;
    const slow = async () => {
      maxRunning = Math.max(maxRunning, ++running);
      await sleep(300);
      running--;
      return { processed: 1 };
    };
    const rs = await Promise.all([1, 2, 3, 4].map(() => runWithLease("test-parallel", slow)));
    expect(rs.filter((r) => r.ran)).toHaveLength(1);
    expect(maxRunning).toBe(1);

    expect((await cron("purge-auth")).status).toBe(200);
    const row = (await ownerQuery("SELECT * FROM cron_leases WHERE slug = 'purge-auth'")).rows[0]!;
    expect(row).toMatchObject({ locked_by: null, locked_until: null, last_error: null, consecutive_failures: 0 });
    expect(row.last_success_at).not.toBeNull();
    expect(row.run_count).toBeGreaterThanOrEqual(1);
  });

  it("heartbeat extends a long run's lease; failures are recorded; an expired lease is taken over", async () => {
    const slug = "test-long-job";
    let during: Date | null = null;
    const r = await runWithLease(
      slug,
      async () => {
        const first = (await ownerQuery("SELECT locked_until FROM cron_leases WHERE slug = $1", [slug])).rows[0]!
          .locked_until;
        await sleep(1600); // lease 2 s, heartbeat every 1 s
        during = (await ownerQuery("SELECT locked_until FROM cron_leases WHERE slug = $1", [slug])).rows[0]!
          .locked_until;
        expect(during!.getTime()).toBeGreaterThan(first.getTime());
        return { processed: 1 };
      },
      2,
    );
    expect(r).toMatchObject({ ran: true, ok: true });

    const f = await runWithLease(slug, async () => {
      throw new Error("handler exploded");
    });
    expect(f).toMatchObject({ ran: true, ok: false });
    const row = (await ownerQuery("SELECT * FROM cron_leases WHERE slug = $1", [slug])).rows[0]!;
    expect(row).toMatchObject({ last_error: "handler exploded", consecutive_failures: 1 });

    // a crashed runner: lease left behind, already expired → the next trigger runs
    await ownerQuery(
      "UPDATE cron_leases SET locked_by = 'dead', locked_until = now() - interval '1 s' WHERE slug = $1",
      [slug],
    );
    expect(await runWithLease(slug, async () => ({ processed: 0 }))).toMatchObject({ ran: true, ok: true });
    // an unexpired foreign lease: skipped
    await ownerQuery(
      "UPDATE cron_leases SET locked_by = 'other', locked_until = now() + interval '1 min' WHERE slug = $1",
      [slug],
    );
    expect(await runWithLease(slug, async () => ({ processed: 0 }))).toEqual({ ran: false });
  });
});

// ================================================================================================ resync
describe("realtime `event: resync` (devops review / D36-5)", () => {
  const note = () => ({ id: crypto.randomUUID() });
  const idsOf = async (topic: string) =>
    (
      await ownerQuery<{ id: string }>("SELECT id::text AS id FROM realtime_events WHERE topic = $1 ORDER BY id", [
        topic,
      ])
    ).rows.map((r) => BigInt(r.id));

  it("a Last-Event-ID older than the retained outbox gets resync with the current head id", async () => {
    const c = await customerLogin();
    const topic = topics.user(c.userId);
    await withCtx(SYS, async (tx) => {
      for (let i = 0; i < 3; i++) await publish(tx, topic, "notification.created", note());
    });
    const ids = await idsOf(topic);
    await ownerQuery("DELETE FROM realtime_events"); // = the 24 h purge
    const s = track(await sse(fetcher, [topic], { token: c.token, lastEventId: String(ids[0]! - 1n) }));
    const ev = await s.waitFor((e) => e.event === "resync");
    expect(JSON.parse(ev.data)).toEqual({ reason: "expired" });
    expect(BigInt(ev.id!)).toBeGreaterThanOrEqual(ids[2]!);
    await s.waitFor((e) => e.event === "ready");
    // live events still flow after the resync
    await withCtx(SYS, (tx) => publish(tx, topic, "notification.created", note()));
    await s.waitFor((e) => e.event === "notification.created");
  });

  it("an up-to-date Last-Event-ID gets a normal replay, no resync", async () => {
    const c = await customerLogin();
    const topic = topics.user(c.userId);
    await withCtx(SYS, async (tx) => {
      for (let i = 0; i < 2; i++) await publish(tx, topic, "notification.created", note());
    });
    const ids = await idsOf(topic);
    const s = track(await sse(fetcher, [topic], { token: c.token, lastEventId: String(ids[0]! - 1n) }));
    await s.waitFor((e) => e.event === "ready");
    expect(s.events.filter((e) => e.event === "notification.created")).toHaveLength(2);
    expect(s.events.some((e) => e.event === "resync")).toBe(false);
  });
});
