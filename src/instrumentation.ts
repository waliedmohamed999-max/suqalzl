/**
 * Sentry (SPEC §2): OFF without SENTRY_DSN (default in dev). sendDefaultPii=false, no Session Replay,
 * and every event/breadcrumb goes through scrubEvent (phones, e-mails, IBANs, addresses, cookies).
 * Keeping Sentry vs GlitchTip in-Kingdom is decided in P8 (T11).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // T10 condition 1: refuse to START (not only on the first SSE request) in staging/production
    // without a dedicated LISTEN connection.
    const { realtimeDatabaseUrl } = await import("./lib/providers/realtime/pg-hub");
    realtimeDatabaseUrl();
  }
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME !== "nodejs" && process.env.NEXT_RUNTIME !== "edge") return;
  const Sentry = await import("@sentry/nextjs");
  const { scrubEvent, scrubValue } = await import("./lib/monitoring/scrub");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.APP_ENV,
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    beforeSend: (event) => scrubEvent(event as never),
    beforeBreadcrumb: (crumb) => scrubValue(crumb) as typeof crumb,
  });
}
