/**
 * Cron handlers by slug (CRON_JOBS in lib/providers/jobs). Each one is idempotent and safe to run
 * concurrently with itself: the route takes a lease per slug (cron_leases, lib/providers/jobs/lease.ts) and the
 * handlers use SKIP LOCKED / conditional updates.
 */
import { releaseExpired } from "@/features/inventory/reservations";
import { getDb, withCtx } from "@/lib/db";
import { claimJobs, completeJob, failJob, type ClaimedJob } from "@/lib/providers/jobs/queue";

export type CronResult = { processed: number; detail?: Record<string, number> };
type Handler = () => Promise<CronResult>;

/** One-off job types processed by run-queue. Feature modules register theirs in later phases. */
const QUEUE_HANDLERS: Record<string, (job: ClaimedJob) => Promise<void>> = {};

export function registerQueueHandler(type: string, fn: (job: ClaimedJob) => Promise<void>) {
  QUEUE_HANDLERS[type] = fn;
}

const sys = (reason: string) => ({ kind: "system" as const, reason });

export const CRON_HANDLERS: Record<string, Handler> = {
  "release-expired-reservations": async () => {
    const n = await withCtx(sys("cron.release-expired-reservations"), (tx) => releaseExpired(tx));
    return { processed: n };
  },

  "purge-auth": async () =>
    withCtx(sys("cron.purge-auth"), async (tx) => {
      const day = new Date(Date.now() - 24 * 3600_000);
      const otp = await tx.otpChallenge.deleteMany({ where: { expiresAt: { lt: day } } });
      const sessions = await tx.session.deleteMany({
        where: { OR: [{ expiresAt: { lt: day } }, { revokedAt: { lt: new Date(Date.now() - 30 * 24 * 3600_000) } }] },
      });
      const devices = await tx.trustedDevice.deleteMany({ where: { expiresAt: { lt: day } } });
      const buckets = await tx.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      return {
        processed: otp.count + sessions.count + devices.count + buckets.count,
        detail: { otp: otp.count, sessions: sessions.count, devices: devices.count, rateLimits: buckets.count },
      };
    }),

  "purge-realtime-events": async () => {
    // SECURITY DEFINER function; the runtime role cannot touch the table directly.
    const rows = await getDb().$queryRaw<{ n: bigint }[]>`SELECT app.purge_realtime_events() AS n`;
    return { processed: Number(rows[0]?.n ?? 0) };
  },

  "run-queue": async () => {
    const jobs = await withCtx(sys("cron.run-queue.claim"), (tx) => claimJobs(tx, 20));
    let ok = 0;
    for (const job of jobs) {
      const handler = QUEUE_HANDLERS[job.type];
      try {
        if (!handler) throw new Error(`no handler for job type ${job.type}`);
        await handler(job); // external calls allowed here: no request transaction is open
        await withCtx(sys("cron.run-queue.complete"), (tx) => completeJob(tx, job.id));
        ok++;
      } catch (e) {
        await withCtx(sys("cron.run-queue.fail"), (tx) => failJob(tx, job, e));
      }
    }
    return { processed: jobs.length, detail: { succeeded: ok, failed: jobs.length - ok } };
  },
};
