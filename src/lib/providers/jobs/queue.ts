/**
 * The `jobs` table queue (devops.md §6.5). Enqueue INSIDE the business transaction (outbox style),
 * so a job exists if and only if the business change committed. External calls happen in the
 * handler, outside any request transaction (SPEC §9).
 */
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { Tx } from "../../db";

export async function enqueueJob(
  tx: Tx,
  input: { type: string; payload?: Prisma.InputJsonValue; runAt?: Date; idempotencyKey?: string; maxAttempts?: number },
): Promise<{ id: string; created: boolean }> {
  if (!/^[a-z0-9-]+$/.test(input.type)) throw new Error("job type must be a slug");
  if (input.idempotencyKey) {
    const existing = await tx.job.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } });
    if (existing) return { id: existing.id, created: false };
  }
  const j = await tx.job.create({
    data: {
      type: input.type,
      payload: input.payload ?? {},
      runAt: input.runAt ?? new Date(),
      idempotencyKey: input.idempotencyKey ?? null,
      maxAttempts: input.maxAttempts ?? 5,
    },
    select: { id: true },
  });
  return { id: j.id, created: true };
}

export interface ClaimedJob {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
}

/** Lease up to `limit` due jobs. Concurrent workers never get the same row (SKIP LOCKED). */
export async function claimJobs(tx: Tx, limit: number, leaseSeconds = 120): Promise<ClaimedJob[]> {
  const worker = randomUUID();
  return tx.$queryRaw<ClaimedJob[]>`
    WITH due AS (
      SELECT id FROM jobs
       WHERE (status = 'PENDING' AND run_at <= now())
          OR (status = 'RUNNING' AND locked_until < now())   -- lease expired: worker died
       ORDER BY run_at
       LIMIT ${limit}
       FOR UPDATE SKIP LOCKED)
    UPDATE jobs j
       SET status = 'RUNNING', attempts = j.attempts + 1, locked_by = ${worker},
           locked_until = now() + make_interval(secs => ${leaseSeconds}), heartbeat_at = now(), updated_at = now()
      FROM due WHERE j.id = due.id
    RETURNING j.id, j.type, j.payload, j.attempts, j.max_attempts`;
}

export async function completeJob(tx: Tx, id: string) {
  await tx.job.update({ where: { id }, data: { status: "SUCCEEDED", completedAt: new Date(), lockedUntil: null, lastError: null } });
}

/** Exponential backoff (30 s × 2^(attempt−1), max 1 h); DEAD after maxAttempts. */
export async function failJob(tx: Tx, job: ClaimedJob, error: unknown) {
  const dead = job.attempts >= job.max_attempts;
  const delay = Math.min(3600, 30 * 2 ** (job.attempts - 1));
  await tx.job.update({
    where: { id: job.id },
    data: {
      status: dead ? "DEAD" : "PENDING",
      runAt: new Date(Date.now() + delay * 1000),
      lockedUntil: null,
      lastError: String(error instanceof Error ? error.message : error).slice(0, 2000),
    },
  });
}
