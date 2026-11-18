/**
 * JobScheduler (SPEC §2, devops.md §6.5). Two parts:
 * 1. CRON triggers: something calls POST /api/cron/<slug> with `Authorization: Bearer CRON_SECRET`.
 *    Local = scripts/dev-cron.mjs (compose `cron`), later = the host's scheduler (P7). The app only
 *    declares WHAT runs and HOW OFTEN (CRON_JOBS); the trigger mechanism is infrastructure.
 * 2. QUEUE: one-off jobs in the `jobs` table (enqueue inside the business transaction, processed by
 *    the `run-queue` cron) with leasing (FOR UPDATE SKIP LOCKED), heartbeat, retries, idempotency.
 */
export interface CronJobDef {
  slug: string;
  /** standard 5-field cron, UTC */
  schedule: string;
  description: string;
}

/** Single source for infra: dev-cron DEV_CRON_JOBS and the production scheduler use these slugs. */
export const CRON_JOBS: CronJobDef[] = [
  { slug: "run-queue", schedule: "* * * * *", description: "process due rows of the jobs table" },
  {
    slug: "release-expired-reservations",
    schedule: "*/5 * * * *",
    description: "free expired stock reservations (6.2-5, C3)",
  },
  {
    slug: "purge-auth",
    schedule: "17 * * * *",
    description: "delete expired OTP challenges, sessions, rate-limit buckets",
  },
  {
    slug: "purge-realtime-events",
    schedule: "23 3 * * *",
    description: "delete realtime outbox rows older than 24 h (SPEC 5.1)",
  },
];

export interface JobScheduler {
  readonly name: "local" | "http";
  jobs(): CronJobDef[];
}

export class LocalJobScheduler implements JobScheduler {
  readonly name = "local" as const;
  jobs() {
    return CRON_JOBS;
  }
}

/** External scheduler (Cloud Scheduler, host cron, ...). Same contract: POST /api/cron/<slug>. */
export class HttpJobScheduler implements JobScheduler {
  readonly name = "http" as const;
  jobs() {
    return CRON_JOBS;
  }
}

export function jobScheduler(): JobScheduler {
  return process.env.JOB_SCHEDULER === "http" ? new HttpJobScheduler() : new LocalJobScheduler();
}
