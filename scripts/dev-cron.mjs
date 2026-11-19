#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Local cron trigger (DEV ONLY). Stand-in for the host's scheduler (P7).
// Calls POST <target>/api/cron/<job> with `Authorization: Bearer <CRON_SECRET>`.
// The app owns leasing/idempotency (devops.md §6.5), so overlapping calls are safe.
//
// Which jobs and when:
// - The job list and each job's 5-field UTC `schedule` come from the app's
//   registry, CRON_JOBS in src/lib/providers/jobs/index.ts (single source; the
//   production scheduler uses the same list). Override the path with
//   DEV_CRON_REGISTRY.
// - DEV_CRON_JOBS selects jobs: "all" or a comma list of slugs. Empty = idle.
// - Default: every job runs when its schedule matches the current UTC minute.
// - DEV_CRON_INTERVAL_SECONDS=N (N >= 10) switches to the old fixed-interval mode
//   (every selected job every N seconds, schedule ignored) for quick local tests.
//
//   node scripts/dev-cron.mjs            # loop (used by the compose `cron` service)
//   node scripts/dev-cron.mjs --once     # call every selected job once, then exit
//   node scripts/dev-cron.mjs --list     # print jobs, schedules and next run; exit
//
// No dependencies: plain Node 18+ (global fetch). Reads env only; never prints
// the secret.
// -----------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = (process.env.DEV_CRON_TARGET_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const registryPath = path.resolve(here, "..", process.env.DEV_CRON_REGISTRY || "src/lib/providers/jobs/index.ts");
const selection = (process.env.DEV_CRON_JOBS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const intervalRaw = Number(process.env.DEV_CRON_INTERVAL_SECONDS || 0);
const intervalSeconds = intervalRaw > 0 ? Math.max(10, intervalRaw) : 0;
const secret = process.env.CRON_SECRET || "";
const once = process.argv.includes("--once");
const listOnly = process.argv.includes("--list");

// ---------------------------------------------------------------------------
// Minimal 5-field cron (minute hour day-of-month month day-of-week), UTC.
// Supports *, n, a-b, a,b,c, */n, a-b/n. Day-of-week 0-7 (0 and 7 = Sunday).
// When both day-of-month and day-of-week are restricted, either may match
// (standard Vixie cron rule).
// ---------------------------------------------------------------------------
const FIELDS = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day-of-month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day-of-week", min: 0, max: 7 },
];

export function parseCron(expr) {
  const parts = String(expr).trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`"${expr}": need 5 fields`);
  return parts.map((part, i) => {
    const { name, min, max } = FIELDS[i];
    const set = new Set();
    for (const item of part.split(",")) {
      const m = item.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
      if (!m) throw new Error(`"${expr}": bad ${name} "${item}"`);
      let [lo, hi] = m[1] === "*" ? [min, max] : m[1].split("-").map(Number);
      if (hi === undefined) hi = m[2] ? max : lo;
      const step = m[2] ? Number(m[2]) : 1;
      if (lo < min || hi > max || lo > hi || step < 1) throw new Error(`"${expr}": ${name} out of range`);
      for (let v = lo; v <= hi; v += step) set.add(i === 4 && v === 7 ? 0 : v);
    }
    return { set, any: part === "*" };
  });
}

export function cronMatches(fields, date) {
  const [mi, h, dom, mon, dow] = fields;
  if (!mi.set.has(date.getUTCMinutes()) || !h.set.has(date.getUTCHours())) return false;
  if (!mon.set.has(date.getUTCMonth() + 1)) return false;
  const domOk = dom.set.has(date.getUTCDate());
  const dowOk = dow.set.has(date.getUTCDay());
  if (dom.any || dow.any) return domOk && dowOk;
  return domOk || dowOk;
}

export function nextRun(fields, from) {
  const t = new Date(from);
  t.setUTCSeconds(0, 0);
  for (let i = 1; i <= 366 * 24 * 60; i++) {
    t.setUTCMinutes(t.getUTCMinutes() + 1);
    if (cronMatches(fields, t)) return t.toISOString();
  }
  return "never";
}

/** Reads CRON_JOBS from the TypeScript registry without executing it. */
export function readRegistry(file) {
  const src = readFileSync(file, "utf8");
  const start = src.indexOf("CRON_JOBS");
  if (start < 0) throw new Error(`no CRON_JOBS in ${file}`);
  const block = src.slice(start, src.indexOf("];", start));
  const jobs = [];
  for (const m of block.matchAll(/slug:\s*["']([a-z0-9-]+)["']\s*,\s*schedule:\s*["']([^"']+)["']/g)) {
    jobs.push({ slug: m[1], schedule: m[2], fields: parseCron(m[2]) });
  }
  if (jobs.length === 0) throw new Error(`CRON_JOBS in ${file} has no { slug, schedule } entries`);
  return jobs;
}

function log(msg) {
  console.log(`[dev-cron] ${new Date().toISOString()} ${msg}`);
}

async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1|app|host\.docker\.internal)(:\d+)?$/.test(target)) {
    console.error(`[dev-cron] refusing non-local target ${target}: this script is for local development only`);
    process.exit(2);
  }

  let registry;
  try {
    registry = readRegistry(registryPath);
  } catch (err) {
    console.error(`[dev-cron] cannot read the job registry: ${err.message}`);
    process.exit(2);
  }

  const all = selection.length === 1 && selection[0] === "all";
  const jobs = [];
  for (const slug of all ? registry.map((j) => j.slug) : selection) {
    const job = registry.find((j) => j.slug === slug);
    if (job) jobs.push(job);
    else console.error(`[dev-cron] skip "${slug}": not in CRON_JOBS (${registry.map((j) => j.slug).join(", ")})`);
  }

  if (listOnly) {
    const now = new Date();
    for (const j of registry) {
      const on = jobs.includes(j) ? "on " : "off";
      console.log(`${on} ${j.slug.padEnd(32)} ${j.schedule.padEnd(14)} next ${nextRun(j.fields, now)}`);
    }
    console.log(intervalSeconds ? `mode: fixed interval ${intervalSeconds}s` : "mode: schedule (UTC)");
    return;
  }

  if (!secret) {
    console.error("[dev-cron] CRON_SECRET is empty. Run scripts/dev-setup.sh or set it in .env");
    process.exit(2);
  }
  if (jobs.length === 0) {
    console.log("[dev-cron] no jobs selected (DEV_CRON_JOBS empty or unknown): idling. Set DEV_CRON_JOBS=all in .env.");
    if (once) return;
    setInterval(() => {}, 1 << 30);
    return;
  }

  const running = new Set();
  const call = async (job) => {
    if (running.has(job.slug)) {
      log(`${job.slug} -> skipped (previous call still running)`);
      return;
    }
    running.add(job.slug);
    const started = Date.now();
    try {
      const res = await fetch(`${target}/api/cron/${job.slug}`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(55_000),
      });
      log(`${job.slug} -> ${res.status} (${Date.now() - started} ms)`);
    } catch (err) {
      log(`${job.slug} -> error: ${err?.message ?? err}`);
    } finally {
      running.delete(job.slug);
    }
  };

  const desc = jobs.map((j) => `${j.slug}[${intervalSeconds ? `${intervalSeconds}s` : j.schedule}]`).join(", ");
  console.log(`[dev-cron] target=${target} ${intervalSeconds ? "fixed-interval" : "schedule"} mode: ${desc}`);

  if (once) {
    await Promise.all(jobs.map(call));
    return;
  }

  if (intervalSeconds) {
    const round = () => jobs.forEach(call);
    round();
    setInterval(round, intervalSeconds * 1000);
    return;
  }

  // Schedule mode: wake up just after each UTC minute boundary; each minute is
  // evaluated once even if the timer drifts.
  let lastMinute = -1;
  const tick = () => {
    const now = new Date();
    const minute = Math.floor(now.getTime() / 60_000);
    if (minute !== lastMinute) {
      lastMinute = minute;
      for (const job of jobs) if (cronMatches(job.fields, now)) call(job);
    }
    setTimeout(tick, 60_000 - (now.getTime() % 60_000) + 250);
  };
  tick();
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
