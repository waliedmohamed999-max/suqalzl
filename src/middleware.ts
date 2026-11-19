import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { buildCsp, generateNonce } from "./lib/security/csp";

const intl = createIntlMiddleware(routing);

// Cookie names mirror src/lib/auth/session.ts (kept literal: middleware must stay edge-safe).
const SESSION_COOKIES = ["__Host-szl_session", "szl_session"];

/**
 * 1. D29: /en/admin and /en/vendor → Arabic.
 * 2. Protected areas (/admin, /vendor, /account, with or without /en): no session cookie → login,
 *    with ?next= for the return path. This is only a fast pre-check; the layouts call requireArea()
 *    which validates the session and role in the database on every request.
 * 3. next-intl locale routing.
 * 4. CSP (QA-B7, src/lib/security/csp.ts): per-request nonce passed to Next.js through the request
 *    headers (x-nonce + the CSP header Next parses), and the policy headers on the response.
 */
export default function middleware(req: NextRequest) {
  return route(req);
}

function withCsp(req: NextRequest, next: (r: NextRequest) => NextResponse): NextResponse {
  const nonce = generateNonce();
  const { enforced, reportOnly } = buildCsp({
    nonce,
    dev: process.env.NODE_ENV !== "production",
    reportUri: "/api/csp-report",
    https: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
  });
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy-report-only", reportOnly);
  const res = next(new NextRequest(req, { headers }));
  res.headers.set("Content-Security-Policy", enforced);
  res.headers.set("Content-Security-Policy-Report-Only", reportOnly);
  return res;
}

function route(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;

  const en = /^\/en(\/(admin|vendor)(\/.*)?)$/.exec(pathname);
  if (en?.[1]) return NextResponse.redirect(new URL(`${en[1]}${search}`, req.url));

  const m = /^(\/en)?\/(admin|vendor|account)(\/.*)?$/.exec(pathname);
  if (m) {
    const hasSession = SESSION_COOKIES.some((n) => req.cookies.get(n)?.value);
    if (!hasSession) {
      const login = m[2] === "account" ? `${m[1] ?? ""}/login` : "/staff/login";
      const url = new URL(login, req.url);
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }
  return withCsp(req, (r) => intl(r));
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
