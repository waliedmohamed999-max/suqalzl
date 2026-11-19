import type { Tx } from "@/lib/db";

/**
 * StockReservation (backend.md C3), ported from P1-00. Must run in a system step (asSystem) — checkout internals / cron.
 * The ONLY write path to reserved_stock is a conditional atomic UPDATE:
 *   UPDATE ... SET reserved = reserved + q WHERE id = ? AND stock - reserved >= q
 * Postgres re-evaluates the WHERE on the latest row version after waiting for the row lock
 * (READ COMMITTED), so concurrent callers serialize on the row and the condition cannot be
 * bypassed. Zero rows = out of stock. Never SELECT-then-UPDATE.
 */
export class OutOfStockError extends Error {
  readonly code = "OUT_OF_STOCK";
  constructor(readonly variantId: string) {
    super("OUT_OF_STOCK");
  }
}
export class ReservationGoneError extends Error {
  readonly code = "RESERVATION_GONE";
  constructor() {
    super("RESERVATION_GONE");
  }
}

export interface ReserveItem {
  variantId: string;
  qty: number;
}

export async function reserve(
  tx: Tx,
  items: ReserveItem[],
  source: { type: "ORDER" | "PRICE_LOCK"; id: string },
  ttlSeconds: number,
): Promise<string[]> {
  // Merge duplicates, then lock rows in ascending variantId order -> no deadlock between carts.
  const merged = new Map<string, number>();
  for (const i of items) {
    if (!Number.isInteger(i.qty) || i.qty <= 0) throw new Error("qty must be a positive integer");
    merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.qty);
  }
  const ordered = [...merged.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const ids: string[] = [];
  for (const [variantId, qty] of ordered) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE product_variants
         SET reserved_stock = reserved_stock + ${qty}, updated_at = now()
       WHERE id = ${variantId}::uuid AND is_active AND stock - reserved_stock >= ${qty}
   RETURNING id`;
    if (rows.length === 0) throw new OutOfStockError(variantId); // caller's tx rolls back earlier lines
    const r = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO stock_reservations (variant_id, qty, source_type, source_id, expires_at)
      VALUES (${variantId}::uuid, ${qty}, ${source.type}::"ReservationSource", ${source.id}::uuid,
              now() + make_interval(secs => ${ttlSeconds}))
      RETURNING id`;
    ids.push(r[0]!.id);
  }
  return ids;
}

/** Payment confirmed: stock leaves the warehouse. Fails if the reservation already expired/was released. */
export async function consume(tx: Tx, reservationId: string): Promise<void> {
  const r = await tx.$queryRaw<{ variant_id: string; qty: number }[]>`
    UPDATE stock_reservations SET status = 'CONSUMED', updated_at = now()
     WHERE id = ${reservationId}::uuid AND status = 'ACTIVE' AND expires_at > now()
 RETURNING variant_id, qty`;
  const row = r[0];
  if (!row) throw new ReservationGoneError();
  await tx.$executeRaw`
    UPDATE product_variants
       SET stock = stock - ${row.qty}, reserved_stock = reserved_stock - ${row.qty}, updated_at = now()
     WHERE id = ${row.variant_id}::uuid`;
}

/** Explicit cancel (customer removes locked item, payment failed). Idempotent. */
export async function release(tx: Tx, reservationId: string): Promise<boolean> {
  const r = await tx.$queryRaw<{ variant_id: string; qty: number }[]>`
    UPDATE stock_reservations SET status = 'RELEASED', updated_at = now()
     WHERE id = ${reservationId}::uuid AND status = 'ACTIVE'
 RETURNING variant_id, qty`;
  const row = r[0];
  if (!row) return false;
  await tx.$executeRaw`
    UPDATE product_variants SET reserved_stock = reserved_stock - ${row.qty}, updated_at = now()
     WHERE id = ${row.variant_id}::uuid`;
  return true;
}

/**
 * Cron sweep (P5-03). SKIP LOCKED: several workers can run at once without double release,
 * and a reservation being consumed right now (row locked) is simply skipped this round.
 * Variant rows are then updated in ascending id order (same lock order as reserve()).
 */
export async function releaseExpired(tx: Tx, limit = 500): Promise<number> {
  const rel = await tx.$queryRaw<{ variant_id: string; qty: number }[]>`
    WITH picked AS (
      SELECT id FROM stock_reservations
       WHERE status = 'ACTIVE' AND expires_at <= now()
       ORDER BY expires_at
       LIMIT ${limit}
       FOR UPDATE SKIP LOCKED)
    UPDATE stock_reservations s SET status = 'RELEASED', updated_at = now()
      FROM picked WHERE s.id = picked.id
    RETURNING s.variant_id, s.qty`;
  const perVariant = new Map<string, number>();
  for (const r of rel) perVariant.set(r.variant_id, (perVariant.get(r.variant_id) ?? 0) + r.qty);
  for (const [variantId, qty] of [...perVariant.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    await tx.$executeRaw`
      UPDATE product_variants SET reserved_stock = reserved_stock - ${qty}, updated_at = now()
       WHERE id = ${variantId}::uuid`;
  }
  return rel.length;
}
