/**
 * Content-Security-Policy (QA-B7, SPEC §9). Edge-safe (used by src/middleware.ts).
 *
 * Two headers, so the rollout cannot break checkout:
 * 1. ENFORCED `Content-Security-Policy`: everything that cannot break a Next.js 15 page today —
 *    no plugins, no <base> hijack, no framing of our pages (clickjacking), forms only to us and the
 *    payment providers, scripts only from us + the payment SDK hosts (inline still allowed, see 2).
 * 2. `Content-Security-Policy-Report-Only`: the TARGET script policy — per-request nonce +
 *    'strict-dynamic' (no 'unsafe-inline'). Next.js reads the nonce from this request header and stamps
 *    it on its own scripts for dynamically rendered pages; statically pre-rendered pages cannot carry a
 *    per-request nonce, so enforcing it now would block their inline bootstrap scripts.
 *    Violations go to /api/csp-report. Switch (2) to enforced in P2-03 after the payment pages are
 *    built and the reports are clean (or move those pages to dynamic rendering). Decision recorded in
 *    the P1-01d hand-off.
 *
 * Provider hosts (Moyasar, Tabby, Tamara, Apple Pay) are the documented SDK/API origins and must be
 * re-checked against each provider's integration guide in P2-03 / P5-01 (sandbox).
 */
export const PAYMENT_ORIGINS = {
  script: [
    "https://cdn.moyasar.com",
    "https://checkout.tabby.ai",
    "https://cdn.tamara.co",
    "https://applepay.cdn-apple.com",
  ],
  connect: ["https://api.moyasar.com", "https://*.moyasar.com", "https://*.tabby.ai", "https://*.tamara.co"],
  frame: ["https://*.moyasar.com", "https://*.tabby.ai", "https://*.tamara.co"],
  form: ["https://*.moyasar.com", "https://*.tabby.ai", "https://*.tamara.co"],
} as const;

const MONITORING_ORIGINS = ["https://*.ingest.sentry.io", "https://*.ingest.de.sentry.io"];

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

const join = (directives: Record<string, readonly string[]>) =>
  Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");

export function buildCsp(opts: { nonce: string; dev: boolean; reportUri?: string; https?: boolean }) {
  const devScript = opts.dev ? ["'unsafe-eval'"] : []; // React Refresh in `next dev` only
  const devConnect = opts.dev ? ["ws:", "wss:"] : []; // HMR
  const enforced = join({
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'", ...PAYMENT_ORIGINS.form],
    "script-src": ["'self'", "'unsafe-inline'", ...devScript, ...PAYMENT_ORIGINS.script],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...PAYMENT_ORIGINS.connect, ...MONITORING_ORIGINS, ...devConnect],
    "frame-src": ["'self'", ...PAYMENT_ORIGINS.frame],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    // only when served over https: on plain-http `next start` (local, CI e2e) it would break assets
    ...(opts.https && !opts.dev ? { "upgrade-insecure-requests": [] } : {}),
  });
  const reportOnly = join({
    "script-src": [`'nonce-${opts.nonce}'`, "'strict-dynamic'", ...devScript, "https:", "'unsafe-inline'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    ...(opts.reportUri ? { "report-uri": [opts.reportUri] } : {}),
  });
  return { enforced, reportOnly };
}
