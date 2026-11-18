import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { customerScope, vendorScope } from "@/features/negotiation/service";
import { getDb, withCtx } from "@/lib/db";
import { customerCtx, seedFixture, SYS, truncateAll, vendorCtx, type Seed } from "./helpers";

/**
 * Ported from P1-00. Layer 2 — RLS. Simulates "the service forgot the filter" and "someone ran SQL directly as the
 * app role". A single-connection pool forces connection reuse to prove SET LOCAL does not leak.
 */
let s: Seed;
let pool: pg.Pool;
let requestId: string;

async function asApp<T>(
  ctx: { role?: string; vendorId?: string; userId?: string } | null,
  fn: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (ctx) {
      await c.query(
        "SELECT set_config('app.role', $1, true), set_config('app.vendor_id', $2, true), set_config('app.user_id', $3, true)",
        [ctx.role ?? "", ctx.vendorId ?? "", ctx.userId ?? ""],
      );
    }
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

beforeAll(async () => {
  await truncateAll();
  s = await seedFixture();
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  requestId = (
    await customerScope(customerCtx(s, 1)).createRequest({
      variantId: s.variantA,
      cityId: s.city,
      qty: 1,
      targetPrice: 160_000,
    })
  ).requestId;
  await vendorScope(vendorCtx(s, "B")).submitOffer({ requestId, variantId: s.variantB, unitPrice: 170_000, qty: 1 });
});
afterAll(async () => {
  await pool.end();
});

const A = () => ({ role: "vendor", vendorId: s.vendorA, userId: s.ownerA });

describe("RLS as second layer (direct SQL as the app role)", () => {
  it("fails closed with no context", async () => {
    const r = await asApp(null, async (c) => ({
      products: (await c.query("SELECT count(*)::int n FROM products")).rows[0].n,
      vns: (await c.query("SELECT count(*)::int n FROM variant_negotiation_settings")).rows[0].n,
      offers: (await c.query("SELECT count(*)::int n FROM price_offers")).rows[0].n,
    }));
    expect(r).toEqual({ products: 0, vns: 0, offers: 0 });
    await expect(
      asApp(null, (c) =>
        c.query(
          "INSERT INTO products (vendor_id, category_id, name_ar, name_en, slug, base_price) VALUES ($1,$2,'x','x',gen_random_uuid()::text,1)",
          [s.vendorA, s.catBisht],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("vendor A cannot see B's draft product by id", async () => {
    const n = await asApp(
      A(),
      async (c) => (await c.query("SELECT * FROM products WHERE id = $1", [s.productBDraft])).rowCount,
    );
    expect(n).toBe(0);
  });

  it("vendor A UPDATE on B's product touches 0 rows; unfiltered UPDATE touches only A's rows", async () => {
    const one = await asApp(
      A(),
      async (c) => (await c.query("UPDATE products SET base_price = 1 WHERE id = $1", [s.productB])).rowCount,
    );
    expect(one).toBe(0);
    const all = await asApp(A(), async (c) => (await c.query("UPDATE products SET name_ar = name_ar")).rowCount);
    expect(all).toBe(2); // productA + productADraft
  });

  it("vendor A cannot INSERT for B or move own product to B (WITH CHECK)", async () => {
    await expect(
      asApp(A(), (c) =>
        c.query(
          "INSERT INTO products (vendor_id, category_id, name_ar, name_en, slug, base_price) VALUES ($1,$2,'x','x',gen_random_uuid()::text,1)",
          [s.vendorB, s.catBisht],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asApp(A(), (c) => c.query("UPDATE products SET vendor_id = $1 WHERE id = $2", [s.vendorB, s.productA])),
    ).rejects.toThrow(/row-level security|privileged product columns/); // guard trigger fires before WITH CHECK
  });

  it("secret thresholds: owner sees own row only; customer/public see none", async () => {
    const own = await asApp(
      A(),
      async (c) => (await c.query("SELECT variant_id FROM variant_negotiation_settings")).rows,
    );
    expect(own.map((r) => r.variant_id)).toEqual([s.variantA]);
    const cust = await asApp(
      { role: "customer", userId: s.customer1 },
      async (c) => (await c.query("SELECT * FROM variant_negotiation_settings")).rowCount,
    );
    expect(cust).toBe(0);
    const pub = await asApp(
      { role: "public" },
      async (c) => (await c.query("SELECT * FROM variant_negotiation_settings")).rowCount,
    );
    expect(pub).toBe(0);
  });

  it("sealed offers: A sees no offer/thread of B, B sees its own, customer sees all on own request", async () => {
    const q = "SELECT (SELECT count(*) FROM price_offers)::int o, (SELECT count(*) FROM negotiation_threads)::int t";
    expect((await asApp(A(), (c) => c.query(q))).rows[0]).toEqual({ o: 0, t: 0 });
    expect((await asApp({ role: "vendor", vendorId: s.vendorB }, (c) => c.query(q))).rows[0]).toEqual({ o: 1, t: 1 });
    expect((await asApp({ role: "customer", userId: s.customer1 }, (c) => c.query(q))).rows[0]).toEqual({ o: 1, t: 1 });
    expect((await asApp({ role: "customer", userId: s.customer2 }, (c) => c.query(q))).rows[0]).toEqual({ o: 0, t: 0 });
  });

  it("vendor C (not a recipient) cannot read the request", async () => {
    const n = await asApp(
      { role: "vendor", vendorId: s.vendorC },
      async (c) => (await c.query("SELECT * FROM price_requests WHERE id = $1", [requestId])).rowCount,
    );
    expect(n).toBe(0);
  });

  it("buggy service code (forgotten WHERE) through Prisma is still contained by RLS", async () => {
    const leaked = await withCtx(vendorCtx(s, "A"), async (tx) => ({
      offers: await tx.priceOffer.findMany(), // BUG on purpose: no vendorId filter
      threads: await tx.negotiationThread.findMany(),
      vns: await tx.variantNegotiationSettings.findMany({ omit: { floorPrice: false } }),
      updated: (await tx.product.updateMany({ data: { nameAr: "x" } })).count,
    }));
    expect(leaked.offers).toHaveLength(0);
    expect(leaked.threads).toHaveLength(0);
    expect(leaked.vns.map((v) => v.variantId)).toEqual([s.variantA]);
    expect(leaked.updated).toBe(2);
  });

  it("SET LOCAL does not leak to the next user of the same pooled connection", async () => {
    await asApp(A(), async (c) => c.query("SELECT 1"));
    const after = await asApp(null, async (c) => ({
      role: (await c.query("SELECT current_setting('app.role', true) r")).rows[0].r,
      products: (await c.query("SELECT count(*)::int n FROM products")).rows[0].n,
    }));
    expect(after.role ?? "").toBe("");
    expect(after.products).toBe(0);
  });

  it("negative control: session-level set_config(..., false) DOES leak -> forbidden pattern", async () => {
    const c = await pool.connect();
    await c.query("SELECT set_config('app.role', 'system', false)");
    c.release();
    const c2 = await pool.connect(); // same physical connection (max: 1)
    const n = (await c2.query("SELECT count(*)::int n FROM products")).rows[0].n;
    await c2.query("RESET app.role");
    c2.release();
    expect(n).toBeGreaterThan(0); // leaked! hence: only is_local = true, enforced in withCtx()
  });

  it("Prisma withCtx context is gone after the transaction (same pool)", async () => {
    await withCtx(SYS, (tx) => tx.product.count());
    const outside = await getDb().product.count(); // no transaction, no context
    expect(outside).toBe(0);
  });

  it("realtime outbox is not directly accessible; publish validates topic", async () => {
    await expect(asApp({ role: "system" }, (c) => c.query("SELECT * FROM realtime_events"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asApp({ role: "system" }, (c) =>
        c.query("INSERT INTO realtime_events (topic, type, payload) VALUES ('souq','x.y','{}')"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asApp(A(), (c) => c.query("SELECT app.publish_event('pr:all', 'thread.changed', '{}'::jsonb)")),
    ).rejects.toThrow(/invalid realtime topic/);
  });

  it("overhead of withCtx (tx + set_config) vs a bare query", async () => {
    const N = 300;
    let t = performance.now();
    for (let i = 0; i < N; i++) await getDb().$queryRaw`SELECT 1`;
    const bare = (performance.now() - t) / N;
    t = performance.now();
    for (let i = 0; i < N; i++) await getDb().product.findFirst({ where: { id: s.productA, vendorId: s.vendorA } });
    const plain = (performance.now() - t) / N;
    t = performance.now();
    for (let i = 0; i < N; i++)
      await getDb().$transaction((tx) => tx.product.findFirst({ where: { id: s.productA, vendorId: s.vendorA } }));
    const txOnly = (performance.now() - t) / N;
    t = performance.now();
    for (let i = 0; i < N; i++)
      await withCtx(vendorCtx(s, "A"), (tx) =>
        tx.product.findFirst({ where: { id: s.productA, vendorId: s.vendorA } }),
      );
    const ctx = (performance.now() - t) / N;
    console.log(
      `[metric] N=${N} avg ms: SELECT 1 ${bare.toFixed(3)} | findFirst ${plain.toFixed(3)} | $transaction+findFirst ${txOnly.toFixed(3)} | withCtx+findFirst ${ctx.toFixed(3)}`,
    );
    expect(ctx).toBeLessThan(20);
  });
});
