import { CRON_HANDLERS } from "@/features/jobs/handlers";
import { safeEqual } from "@/lib/auth/crypto";
import { runWithLease } from "@/lib/providers/jobs/lease";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cron/<slug>   Authorization: Bearer <CRON_SECRET>   (devops notes §4, SPEC §2 Jobs)
 * 200 { job, processed } | 202 { job, skipped: "running" } | 401 | 404 | 500 { job, error: "FAILED" }
 * Two triggers firing the same slug at once is safe: a lease row in `cron_leases` (pooler-safe, with
 * heartbeat) lets only one run; the other returns 202. Status per slug: cron_leases
 * (lastRunAt, lastSuccessAt, lastError, consecutiveFailures) for monitoring.
 */
export async function POST(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response(null, { status: 401 });

  const { job } = await params;
  const handler = Object.hasOwn(CRON_HANDLERS, job) ? CRON_HANDLERS[job] : undefined;
  if (!handler) return new Response(null, { status: 404 });

  const r = await runWithLease(job, handler);
  if (!r.ran) return Response.json({ job, skipped: "running" }, { status: 202 });
  if (!r.ok) {
    console.error(`[cron] ${job} failed`, r.error);
    return Response.json({ job, error: "FAILED" }, { status: 500 });
  }
  return Response.json({ job, ...r.result });
}
