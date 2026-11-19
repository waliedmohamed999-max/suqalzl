export const runtime = "nodejs";

/**
 * POST /api/csp-report — CSP violation reports (report-uri, `application/csp-report`) from the
 * Report-Only policy (QA-B7). Logs only the directive and the blocked ORIGIN (never full URLs, which
 * may carry tokens or personal data). Always 204; bodies over 8 KB are ignored.
 */
export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (text.length <= 8192) {
      const body = JSON.parse(text) as { "csp-report"?: Record<string, unknown> };
      const r = body["csp-report"] ?? {};
      const directive = String(r["effective-directive"] ?? r["violated-directive"] ?? "?").slice(0, 60);
      const blocked = String(r["blocked-uri"] ?? "?");
      let origin = blocked;
      try {
        origin = new URL(blocked).origin;
      } catch {
        origin = blocked.slice(0, 20); // "inline", "eval", ...
      }
      console.warn(`[csp] report-only violation directive=${directive} blocked=${origin}`);
    }
  } catch {
    /* malformed report: ignore */
  }
  return new Response(null, { status: 204 });
}
