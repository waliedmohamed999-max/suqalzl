/**
 * Fixed-window rate limiting stored in Postgres (rate_limit_buckets) — portable, no Redis (D12).
 * One atomic upsert per hit, so concurrent requests cannot both pass the limit.
 * Must run in a system/staff context (the table has no customer policy).
 */
import type { Tx } from "../db";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: Date;
}

export async function hitRateLimit(
  tx: Tx,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const rows = await tx.$queryRaw<{ count: number; expires_at: Date }[]>`
    INSERT INTO rate_limit_buckets (key, count, window_start, expires_at)
    VALUES (${key}, 1, now(), now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count        = CASE WHEN rate_limit_buckets.expires_at <= now() THEN 1 ELSE rate_limit_buckets.count + 1 END,
      window_start = CASE WHEN rate_limit_buckets.expires_at <= now() THEN now() ELSE rate_limit_buckets.window_start END,
      expires_at   = CASE WHEN rate_limit_buckets.expires_at <= now() THEN now() + make_interval(secs => ${windowSeconds})
                          ELSE rate_limit_buckets.expires_at END
    RETURNING count, expires_at`;
  const row = rows[0]!;
  return { allowed: row.count <= limit, count: row.count, limit, resetAt: row.expires_at };
}

export class RateLimitedError extends Error {
  readonly code = "RATE_LIMITED";
  readonly status = 429;
  constructor(readonly resetAt: Date) {
    super("RATE_LIMITED");
  }
}

/** Current count of a bucket without incrementing it (0 when absent or expired). */
export async function peekRateLimit(tx: Tx, key: string): Promise<{ count: number; resetAt: Date | null }> {
  const rows = await tx.$queryRaw<{ count: number; expires_at: Date }[]>`
    SELECT count, expires_at FROM rate_limit_buckets WHERE key = ${key} AND expires_at > now()`;
  return { count: rows[0]?.count ?? 0, resetAt: rows[0]?.expires_at ?? null };
}

/** Reset a failure counter after a success (D36-2: "يتصفّر عند النجاح"). */
export async function resetRateLimit(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`UPDATE rate_limit_buckets SET count = 0 WHERE key = ${key}`;
}
