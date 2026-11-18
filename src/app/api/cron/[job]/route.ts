import { CRON_HANDLERS } from "@/features/jobs/handlers";
import { safeEqual } from "@/lib/auth/crypto";
import pg from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cron/<slug>   Authorization: Bearer <CRON_SECRET>   (devops notes §4, SPEC §2 Jobs)
 * 200 { job, processed } | 202 { job, skipped: "running" } | 401 | 404
 * Two triggers firing the same slug at once is safe: an advisory lock on a dedicated connection
 * lets only one run; the other returns 202.
 */
export async function POST(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response(null, { status: 401 });

  const { job } = await params;
  const handler = Object.hasOwn(CRON_HANDLERS, job) ? CRON_HANDLERS[job] : undefined;
  if (!handler) return new Response(null, { status: 404 });

  // Dedicated connection (not the pool): a session-level lock must be released on the same backend.
  const lockConn = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await lockConn.connect();
  try {
    const lock = await lockConn.query<{ ok: boolean }>("SELECT pg_try_advisory_lock(hashtext($1)) AS ok", [
      `cron:${job}`,
    ]);
    if (!lock.rows[0]?.ok) return Response.json({ job, skipped: "running" }, { status: 202 });
    try {
      const result = await handler();
      return Response.json({ job, ...result });
    } catch (e) {
      console.error(`[cron] ${job} failed`, e instanceof Error ? e.message : e);
      return Response.json({ job, error: "FAILED" }, { status: 500 });
    }
  } finally {
    await lockConn.end().catch(() => {}); // closing the session releases the lock
  }
}
