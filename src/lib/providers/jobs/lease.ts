/**
 * Cron lease + heartbeat (devops review P1-5/P1-6, SPEC §2 Jobs). Replaces the session-level
 * pg_try_advisory_lock, which is unsafe behind a transaction-mode pooler (the lock lives on whatever
 * backend the pooler picked, and is not released with the client).
 *
 * - acquire: one atomic upsert; succeeds only if nobody holds an UNEXPIRED lease on the slug.
 * - heartbeat: the holder extends `lockedUntil` every leaseSeconds/4 while the handler runs; a runner
 *   that crashed stops heart-beating and its lease expires (next trigger takes over).
 * - release: records lastFinishedAt / lastSuccessAt / lastError / duration / processed and
 *   consecutiveFailures for monitoring (alert on a stale lastSuccessAt, P7).
 * Every statement is a short system-context transaction: no transaction is held while the job runs.
 */
import { randomUUID } from "node:crypto";
import { withCtx } from "../../db";

const sys = (reason: string) => ({ kind: "system" as const, reason });

export interface Lease {
  slug: string;
  worker: string;
  leaseSeconds: number;
}

export async function acquireLease(slug: string, leaseSeconds: number): Promise<Lease | null> {
  const worker = randomUUID();
  const rows = await withCtx(
    sys("cron.lease.acquire"),
    (tx) =>
      tx.$queryRaw<{ slug: string }[]>`
      INSERT INTO cron_leases (slug, locked_by, locked_until, heartbeat_at, last_run_at, run_count, updated_at)
      VALUES (${slug}, ${worker}, now() + make_interval(secs => ${leaseSeconds}), now(), now(), 1, now())
      ON CONFLICT (slug) DO UPDATE SET
        locked_by    = EXCLUDED.locked_by,
        locked_until = EXCLUDED.locked_until,
        heartbeat_at = now(),
        last_run_at  = now(),
        run_count    = cron_leases.run_count + 1,
        updated_at   = now()
      WHERE cron_leases.locked_until IS NULL OR cron_leases.locked_until < now()
      RETURNING slug`,
  );
  return rows.length ? { slug, worker, leaseSeconds } : null;
}

/** false = the lease was lost (expired and taken by another runner). */
export async function heartbeatLease(l: Lease): Promise<boolean> {
  const n = await withCtx(
    sys("cron.lease.heartbeat"),
    (tx) => tx.$executeRaw`
      UPDATE cron_leases SET locked_until = now() + make_interval(secs => ${l.leaseSeconds}),
                             heartbeat_at = now(), updated_at = now()
       WHERE slug = ${l.slug} AND locked_by = ${l.worker}`,
  );
  return n === 1;
}

export async function releaseLease(
  l: Lease,
  result: { ok: true; processed: number; durationMs: number } | { ok: false; error: string; durationMs: number },
): Promise<void> {
  const err = result.ok ? null : result.error.slice(0, 2000);
  const processed = result.ok ? result.processed : null;
  await withCtx(
    sys("cron.lease.release"),
    (tx) => tx.$executeRaw`
      UPDATE cron_leases SET
        locked_by = NULL, locked_until = NULL, last_finished_at = now(), updated_at = now(),
        last_success_at = CASE WHEN ${result.ok} THEN now() ELSE last_success_at END,
        last_error = ${err},
        last_duration_ms = ${Math.round(result.durationMs)},
        last_processed = ${processed}::int,
        consecutive_failures = CASE WHEN ${result.ok} THEN 0 ELSE consecutive_failures + 1 END
       WHERE slug = ${l.slug} AND locked_by = ${l.worker}`,
  );
}

/** Run `fn` under a lease with heartbeats. null = another runner holds the lease (HTTP 202). */
export async function runWithLease<T extends { processed: number }>(
  slug: string,
  fn: () => Promise<T>,
  leaseSeconds = Number(process.env.CRON_LEASE_SECONDS ?? 120),
): Promise<{ ran: false } | { ran: true; ok: true; result: T } | { ran: true; ok: false; error: string }> {
  const lease = await acquireLease(slug, leaseSeconds);
  if (!lease) return { ran: false };
  const started = performance.now();
  const hb = setInterval(() => void heartbeatLease(lease).catch(() => {}), Math.max(1000, (leaseSeconds * 1000) / 4));
  try {
    const result = await fn();
    clearInterval(hb);
    await releaseLease(lease, { ok: true, processed: result.processed, durationMs: performance.now() - started });
    return { ran: true, ok: true, result };
  } catch (e) {
    clearInterval(hb);
    const error = e instanceof Error ? e.message : String(e);
    await releaseLease(lease, { ok: false, error, durationMs: performance.now() - started }).catch(() => {});
    return { ran: true, ok: false, error };
  }
}
