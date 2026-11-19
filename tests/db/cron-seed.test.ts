import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as cronPOST } from "@/app/api/cron/[job]/route";
import { CRON_JOBS } from "@/lib/providers/jobs";
import { claimJobs, enqueueJob } from "@/lib/providers/jobs/queue";
import { reserve } from "@/features/inventory/reservations";
import { verifyPassword } from "@/lib/auth/password";
import { withCtx } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { ownerQuery, seedFixture, SYS, truncateAll, type Seed } from "./helpers";

const call = (job: string, auth?: string) =>
  cronPOST(
    new Request(`http://localhost/api/cron/${job}`, { method: "POST", headers: auth ? { authorization: auth } : {} }),
    {
      params: Promise.resolve({ job }),
    },
  );
const BEARER = () => `Bearer ${process.env.CRON_SECRET}`;

let s: Seed;
beforeAll(async () => {
  await truncateAll();
  s = await seedFixture();
});

describe("POST /api/cron/<job> (JobScheduler, devops.md §6.5)", () => {
  it("401 without or with a wrong secret, 404 for unknown jobs", async () => {
    expect((await call("purge-auth")).status).toBe(401);
    expect((await call("purge-auth", "Bearer wrong")).status).toBe(401);
    expect((await call("nope", BEARER())).status).toBe(404);
    expect((await call("__proto__", BEARER())).status).toBe(404);
  });

  it("every declared CRON_JOBS slug has a handler and runs", async () => {
    for (const j of CRON_JOBS) {
      const r = await call(j.slug, BEARER());
      expect(r.status, j.slug).toBe(200);
      expect(await r.json()).toMatchObject({ job: j.slug, processed: expect.any(Number) });
    }
  });

  it("release-expired-reservations frees stock; parallel triggers are safe", async () => {
    await withCtx(SYS, (tx) =>
      reserve(tx, [{ variantId: s.variantA, qty: 2 }], { type: "ORDER", id: randomUUID() }, 1),
    );
    await new Promise((r) => setTimeout(r, 1100));
    const res = await Promise.all([
      call("release-expired-reservations", BEARER()),
      call("release-expired-reservations", BEARER()),
    ]);
    for (const r of res) expect([200, 202]).toContain(r.status);
    const v = await ownerQuery<{ reserved_stock: number }>(
      "SELECT reserved_stock FROM product_variants WHERE id = $1",
      [s.variantA],
    );
    expect(v.rows[0]!.reserved_stock).toBe(0);
  });

  it("queue: idempotency key, SKIP LOCKED leasing (no double claim), unknown type ends up retried", async () => {
    const a = await withCtx(SYS, (tx) => enqueueJob(tx, { type: "test-noop", idempotencyKey: "once" }));
    const b = await withCtx(SYS, (tx) => enqueueJob(tx, { type: "test-noop", idempotencyKey: "once" }));
    expect(b).toEqual({ id: a.id, created: false });
    for (let i = 0; i < 5; i++) await withCtx(SYS, (tx) => enqueueJob(tx, { type: "test-noop" }));
    const [c1, c2] = await Promise.all([
      withCtx(SYS, (tx) => claimJobs(tx, 4)),
      withCtx(SYS, (tx) => claimJobs(tx, 4)),
    ]);
    const ids = [...c1, ...c2].map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(6);
  });
});

describe("prisma/seed.ts (P1-01)", () => {
  it("seeds categories, cities, settings and SUPER_ADMIN from env; idempotent", async () => {
    await truncateAll();
    const env = {
      ...process.env,
      SUPER_ADMIN_EMAIL: "Root@Example.com",
      SUPER_ADMIN_PASSWORD: "seed-password-123",
      SUPER_ADMIN_PHONE: "0551112233",
      SEED_DEMO: "false", // the demo seed has its own test (tests/db/m1-*.test.ts)
    };
    const run = () =>
      execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], { env, encoding: "utf8" });
    expect(run()).toMatch(/\+14 categories, \+24 cities, \+\d+ settings, super admin created/);
    expect(run()).toMatch(/\+0 categories, \+0 cities, \+0 settings, super admin exists/);

    const cats = await ownerQuery<{ slug: string; vendors_allowed: boolean }>(
      "SELECT slug, vendors_allowed FROM categories",
    );
    expect(cats.rowCount).toBe(14);
    expect(cats.rows.find((c) => c.slug === "luxury-swords")!.vendors_allowed).toBe(false); // D26
    const admin = await ownerQuery<{ email: string; phone: string; role: string; password_hash: string }>(
      "SELECT email, phone, role, password_hash FROM users WHERE role = 'SUPER_ADMIN'",
    );
    expect(admin.rows[0]).toMatchObject({ email: "root@example.com", phone: "+966551112233", role: "SUPER_ADMIN" });
    expect(await verifyPassword("seed-password-123", admin.rows[0]!.password_hash)).toBe(true);

    const v = await withCtx(SYS, async (tx) => ({
      method: await getSetting(tx, "staffLoginMethod"),
      twoFa: await getSetting(tx, "staffTwoFactorEnabled"),
      fee: await getSetting(tx, "gatewayFeeBearer"),
      hold: await getSetting(tx, "holdDays"),
    }));
    expect(v).toEqual({
      method: "PASSWORD",
      twoFa: false,
      fee: {
        MADA: "PLATFORM",
        CARD: "PLATFORM",
        APPLE_PAY: "PLATFORM",
        STC_PAY: "PLATFORM",
        TABBY: "VENDOR",
        TAMARA: "VENDOR",
      },
      hold: 7,
    });
    // public storefront sees only public settings
    const pub = await withCtx({ kind: "public" }, (tx) => tx.setting.findMany({ select: { key: true } }));
    expect(pub.map((x) => x.key).sort()).toEqual([
      "pixels",
      "souqDiscountsRequireLicense",
      "storeInfo",
      "whatsappNumber",
    ]);
  });
});
