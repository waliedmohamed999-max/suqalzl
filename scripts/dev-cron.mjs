#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Local cron trigger (DEV ONLY). Stand-in for Cloud Scheduler / Vercel Cron.
// Every DEV_CRON_INTERVAL_SECONDS it calls POST <target>/api/cron/<job> for each
// job in DEV_CRON_JOBS, with `Authorization: Bearer <CRON_SECRET>`.
// The app owns leasing/idempotency (devops.md §6.5), so overlapping calls are safe.
//
//   node scripts/dev-cron.mjs            # loop (used by the compose `cron` service)
//   node scripts/dev-cron.mjs --once     # one round, then exit (manual testing)
//
// No dependencies: plain Node 18+ (global fetch). Reads env only; never prints
// the secret.
// -----------------------------------------------------------------------------

const target = (process.env.DEV_CRON_TARGET_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const jobs = (process.env.DEV_CRON_JOBS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const intervalSeconds = Math.max(10, Number(process.env.DEV_CRON_INTERVAL_SECONDS || 60));
const secret = process.env.CRON_SECRET || "";
const once = process.argv.includes("--once");

if (!/^https?:\/\/(localhost|127\.0\.0\.1|app|host\.docker\.internal)(:\d+)?$/.test(target)) {
  console.error(`[dev-cron] refusing non-local target ${target}: this script is for local development only`);
  process.exit(2);
}
if (!secret) {
  console.error("[dev-cron] CRON_SECRET is empty. Run scripts/dev-setup.sh or set it in .env");
  process.exit(2);
}
if (jobs.length === 0) {
  console.log("[dev-cron] DEV_CRON_JOBS is empty: nothing to trigger. Idling (set it in .env, e.g. DEV_CRON_JOBS=cancel-unpaid-orders).");
  if (once) process.exit(0);
  setInterval(() => {}, 1 << 30);
} else {
  const round = async () => {
    for (const job of jobs) {
      if (!/^[a-z0-9-]+$/.test(job)) {
        console.error(`[dev-cron] skip invalid job name "${job}" (allowed: a-z 0-9 -)`);
        continue;
      }
      const started = Date.now();
      try {
        const res = await fetch(`${target}/api/cron/${job}`, {
          method: "POST",
          headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
          body: "{}",
          signal: AbortSignal.timeout(55_000),
        });
        console.log(`[dev-cron] ${new Date().toISOString()} ${job} -> ${res.status} (${Date.now() - started} ms)`);
      } catch (err) {
        console.error(`[dev-cron] ${new Date().toISOString()} ${job} -> error: ${err?.message ?? err}`);
      }
    }
  };
  console.log(`[dev-cron] target=${target} every ${intervalSeconds}s jobs=${jobs.join(",")}`);
  await round();
  if (!once) setInterval(round, intervalSeconds * 1000);
}
