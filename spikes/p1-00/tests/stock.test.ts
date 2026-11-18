import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  consume,
  OutOfStockError,
  release,
  releaseExpired,
  reserve,
  ReservationGoneError,
} from "@/features/inventory/reservations";
import { withCtx, type Tx } from "@/lib/context";
import { seed, truncateAll, type Seed } from "./helpers";

const sys = { kind: "system" } as const;
let s: Seed;

async function setStock(variantId: string, stock: number) {
  await withCtx(sys, async (tx) => {
    await tx.stockReservation.updateMany({ where: { variantId }, data: { status: "RELEASED" } });
    await tx.productVariant.update({ where: { id: variantId }, data: { stock, reservedStock: 0 } });
  });
}
async function state(variantId: string) {
  return withCtx(sys, async (tx) => {
    const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    const active = await tx.stockReservation.aggregate({ where: { variantId, status: "ACTIVE" }, _sum: { qty: true }, _count: true });
    return { stock: v.stock, reserved: v.reservedStock, activeCount: active._count, activeQty: active._sum.qty ?? 0 };
  });
}

/** Fire n attempts at once (all promises created before any is awaited). */
async function storm(n: number, attempt: (i: number) => Promise<unknown>) {
  const t0 = performance.now();
  const res = await Promise.allSettled(Array.from({ length: n }, (_, i) => attempt(i)));
  const ms = performance.now() - t0;
  const ok = res.filter((r) => r.status === "fulfilled").length;
  const oos = res.filter((r) => r.status === "rejected" && r.reason instanceof OutOfStockError).length;
  const other = res.filter((r) => r.status === "rejected" && !(r.reason instanceof OutOfStockError));
  return { ok, oos, other: other.map((r) => String((r as PromiseRejectedResult).reason)), ms };
}

beforeAll(async () => {
  await truncateAll();
  s = await seed();
});

describe("StockReservation under concurrency", () => {
  beforeEach(async () => setStock(s.variantA, 3));

  it("50 concurrent reservations on the last 3 units -> exactly 3 succeed (x20 rounds)", async () => {
    const rounds: { ok: number; oos: number; ms: number }[] = [];
    for (let round = 0; round < 20; round++) {
      await setStock(s.variantA, 3);
      const r = await storm(50, () =>
        withCtx(sys, (tx) => reserve(tx, [{ variantId: s.variantA, qty: 1 }], { type: "ORDER", id: randomUUID() }, 1800)),
      );
      expect(r.other).toEqual([]);
      expect(r.ok).toBe(3);
      expect(r.oos).toBe(47);
      const st = await state(s.variantA);
      expect(st).toEqual({ stock: 3, reserved: 3, activeCount: 3, activeQty: 3 });
      rounds.push(r);
    }
    const avg = rounds.reduce((a, r) => a + r.ms, 0) / rounds.length;
    console.log(`[metric] 20 rounds x 50 concurrent: success=${rounds.map((r) => r.ok).join(",")} avg storm ${avg.toFixed(1)} ms`);
  });

  it("mixed quantities: 50 buyers of qty 1..3 on stock 3 never exceed 3 units", async () => {
    const r = await storm(50, (i) =>
      withCtx(sys, (tx) => reserve(tx, [{ variantId: s.variantA, qty: (i % 3) + 1 }], { type: "ORDER", id: randomUUID() }, 1800)),
    );
    expect(r.other).toEqual([]);
    const st = await state(s.variantA);
    expect(st.reserved).toBe(st.activeQty);
    expect(st.reserved).toBeLessThanOrEqual(3);
    console.log(`[metric] mixed qty: ${r.ok} reservations succeeded, reserved=${st.reserved}/3`);
  });

  it("negative control: naive SELECT-then-UPDATE oversells under the same storm", async () => {
    const naive = (tx: Tx) => async () => {
      const [v] = await tx.$queryRaw<{ stock: number; reserved_stock: number }[]>`
        SELECT stock, reserved_stock FROM product_variants WHERE id = ${s.variantA}::uuid`;
      if (v!.stock - v!.reserved_stock < 1) throw new OutOfStockError(s.variantA);
      await new Promise((r) => setTimeout(r, 5)); // realistic gap (app logic between read and write)
      await tx.$executeRaw`UPDATE product_variants SET reserved_stock = ${v!.reserved_stock + 1} WHERE id = ${s.variantA}::uuid`;
      await tx.stockReservation.create({
        data: { variantId: s.variantA, qty: 1, sourceType: "ORDER", sourceId: randomUUID(), expiresAt: new Date(Date.now() + 1e6) },
      });
    };
    const r = await storm(50, () => withCtx(sys, (tx) => naive(tx)()));
    const st = await state(s.variantA);
    console.log(`[metric] naive: ${r.ok} "successful" reservations for 3 units; reserved_stock=${st.reserved}`);
    expect(r.ok).toBeGreaterThan(3); // proves the test would catch the bug
  });

  it("multi-item carts in opposite order do not deadlock (sorted lock order)", async () => {
    await setStock(s.variantA, 100);
    await setStock(s.variantB, 100);
    const r = await storm(40, (i) =>
      withCtx(sys, (tx) =>
        reserve(
          tx,
          i % 2 ? [{ variantId: s.variantA, qty: 1 }, { variantId: s.variantB, qty: 1 }] : [{ variantId: s.variantB, qty: 1 }, { variantId: s.variantA, qty: 1 }],
          { type: "ORDER", id: randomUUID() },
          1800,
        ),
      ),
    );
    expect(r.other).toEqual([]);
    expect(r.ok).toBe(40);
    expect((await state(s.variantA)).reserved).toBe(40);
    expect((await state(s.variantB)).reserved).toBe(40);
  });

  it("all-or-nothing: a cart whose 2nd line is out of stock reserves nothing", async () => {
    await setStock(s.variantA, 5);
    await setStock(s.variantB, 0);
    await expect(
      withCtx(sys, (tx) =>
        reserve(tx, [{ variantId: s.variantA, qty: 2 }, { variantId: s.variantB, qty: 1 }], { type: "ORDER", id: randomUUID() }, 1800),
      ),
    ).rejects.toBeInstanceOf(OutOfStockError);
    expect(await state(s.variantA)).toMatchObject({ reserved: 0, activeCount: 0 });
  });

  it("DB CHECK is the last line: reserved_stock can never exceed stock even with a raw UPDATE", async () => {
    await expect(
      withCtx(sys, (tx) => tx.$executeRaw`UPDATE product_variants SET reserved_stock = stock + 1 WHERE id = ${s.variantA}::uuid`),
    ).rejects.toThrow(/product_variants_reserved_le_stock/);
  });
});

describe("expiry, consume, release", () => {
  beforeEach(async () => setStock(s.variantA, 3));

  it("expired reservations are released and the units become available again", async () => {
    const ids = await withCtx(sys, (tx) =>
      reserve(tx, [{ variantId: s.variantA, qty: 3 }], { type: "PRICE_LOCK", id: randomUUID() }, 1),
    );
    await expect(
      withCtx(sys, (tx) => reserve(tx, [{ variantId: s.variantA, qty: 1 }], { type: "ORDER", id: randomUUID() }, 60)),
    ).rejects.toBeInstanceOf(OutOfStockError);
    await new Promise((r) => setTimeout(r, 1200));
    const n = await withCtx(sys, (tx) => releaseExpired(tx));
    expect(n).toBe(1);
    expect(await state(s.variantA)).toMatchObject({ stock: 3, reserved: 0, activeCount: 0 });
    // consuming the expired reservation must fail (payment arrived too late -> PAID_NEEDS_REVIEW path)
    await expect(withCtx(sys, (tx) => consume(tx, ids[0]!))).rejects.toBeInstanceOf(ReservationGoneError);
    await withCtx(sys, (tx) => reserve(tx, [{ variantId: s.variantA, qty: 3 }], { type: "ORDER", id: randomUUID() }, 60));
    expect((await state(s.variantA)).reserved).toBe(3);
  });

  it("consume decrements stock and reserved together; double consume fails", async () => {
    const [id] = await withCtx(sys, (tx) => reserve(tx, [{ variantId: s.variantA, qty: 2 }], { type: "ORDER", id: randomUUID() }, 60));
    await withCtx(sys, (tx) => consume(tx, id!));
    expect(await state(s.variantA)).toMatchObject({ stock: 1, reserved: 0 });
    await expect(withCtx(sys, (tx) => consume(tx, id!))).rejects.toBeInstanceOf(ReservationGoneError);
  });

  it("race: concurrent consume vs expiry sweep vs release on the same reservations keeps invariants", async () => {
    await setStock(s.variantA, 60);
    const ids = await withCtx(sys, async (tx) => {
      const out: string[] = [];
      for (let i = 0; i < 30; i++)
        out.push(...(await reserve(tx, [{ variantId: s.variantA, qty: 2 }], { type: "ORDER", id: randomUUID() }, 1)));
      return out;
    });
    await new Promise((r) => setTimeout(r, 1100)); // all expired now; consume must lose, sweep must win once
    const jobs: Promise<unknown>[] = [];
    for (const id of ids) {
      jobs.push(withCtx(sys, (tx) => consume(tx, id)));
      jobs.push(withCtx(sys, (tx) => release(tx, id)));
    }
    for (let w = 0; w < 4; w++) jobs.push(withCtx(sys, (tx) => releaseExpired(tx))); // 4 parallel cron workers
    const res = await Promise.allSettled(jobs);
    const unexpected = res.filter((r) => r.status === "rejected" && !(r.reason instanceof ReservationGoneError));
    expect(unexpected).toEqual([]);
    const st = await state(s.variantA);
    expect(st).toEqual({ stock: 60, reserved: 0, activeCount: 0, activeQty: 0 });
    const statuses = await withCtx(sys, (tx) =>
      tx.stockReservation.groupBy({ by: ["status"], where: { id: { in: ids } }, _count: true }),
    );
    expect(statuses).toEqual([{ status: "RELEASED", _count: 30 }]);
  });

  it("race (live reservations): concurrent consume and release -> each reservation ends in exactly one state", async () => {
    await setStock(s.variantA, 60);
    const ids = await withCtx(sys, async (tx) => {
      const out: string[] = [];
      for (let i = 0; i < 30; i++)
        out.push(...(await reserve(tx, [{ variantId: s.variantA, qty: 2 }], { type: "ORDER", id: randomUUID() }, 600)));
      return out;
    });
    const jobs = ids.flatMap((id) => [withCtx(sys, (tx) => consume(tx, id)), withCtx(sys, (tx) => release(tx, id))]);
    await Promise.allSettled(jobs);
    const rows = await withCtx(sys, (tx) => tx.stockReservation.findMany({ where: { id: { in: ids } } }));
    const consumed = rows.filter((r) => r.status === "CONSUMED").length;
    const released = rows.filter((r) => r.status === "RELEASED").length;
    expect(consumed + released).toBe(30);
    const st = await state(s.variantA);
    expect(st.reserved).toBe(0);
    expect(st.stock).toBe(60 - consumed * 2);
    console.log(`[metric] consume/release race: consumed=${consumed} released=${released} stock=${st.stock}`);
  });
});
