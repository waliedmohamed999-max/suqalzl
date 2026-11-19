/**
 * Route Handler helpers: JSON errors with stable codes (the UI maps `code` → messages/*.json
 * "errors.*"), CSRF origin check, request metadata, cookies.
 */
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth/service";
import type { CookieSpec } from "./auth/session";
import { RateLimitedError } from "./auth/rate-limit";
import { ForbiddenError, NotFoundError } from "./db";
import { PermissionDeniedError, UnauthorizedError } from "./permissions";

export interface ApiErrorBody {
  error: { code: string; retryAt?: string; issues?: { path: string; code: string }[] };
}

export function apiError(status: number, code: string, extra: Omit<ApiErrorBody["error"], "code"> = {}) {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, ...extra } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

/** Maps known errors to responses; anything else is a 500 without details (never leak internals). */
export function handleError(e: unknown) {
  if (e instanceof AuthError) return apiError(e.status, e.code, e.retryAt ? { retryAt: e.retryAt.toISOString() } : {});
  if (e instanceof RateLimitedError) return apiError(429, "RATE_LIMITED", { retryAt: e.resetAt.toISOString() });
  if (e instanceof ZodError)
    return apiError(400, "VALIDATION", { issues: e.issues.map((i) => ({ path: i.path.join("."), code: i.code })) });
  if (e instanceof UnauthorizedError) return apiError(401, "UNAUTHORIZED");
  if (e instanceof PermissionDeniedError || e instanceof ForbiddenError) return apiError(403, "FORBIDDEN");
  if (e instanceof NotFoundError) return apiError(404, "NOT_FOUND");
  console.error("[api] unhandled", e instanceof Error ? e.message : e);
  return apiError(500, "INTERNAL");
}

/**
 * CSRF for cookie-authenticated, state-changing Route Handlers: the Origin (or Referer) must be our
 * own APP_URL. Requests with a Bearer token (mobile app) are not cookie-based and are allowed.
 * Server Actions already get Next.js' built-in Origin check (SPEC §9).
 */
export function assertSameOrigin(req: Request) {
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return;
  const expected = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
  const origin =
    req.headers.get("origin") ?? (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null);
  if (origin !== expected) throw new PermissionDeniedError();
}

/**
 * Client IP (QA-B1, SPEC §9 / D36-2). X-Forwarded-For is a list every proxy APPENDS to, so only the
 * entries added by OUR proxies can be trusted: with TRUSTED_PROXY_HOPS = N the client is the N-th
 * entry from the RIGHT. Anything to its left was written by the client and is ignored.
 * - N = 0 (default, safe): XFF and X-Real-IP are ignored completely -> ip = null (no IP-keyed limit;
 *   the per-phone/e-mail limits and the global SMS budget still apply). Set N in staging/prod (P7).
 * - Fewer entries than N: the request did not come through our proxy chain -> ip = null.
 * - The value must parse as an IP (net.isIP); otherwise null.
 */
export function clientIp(headers: Headers, hops = trustedProxyHops()): string | null {
  if (hops <= 0) return null;
  const parts = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < hops) return null;
  const candidate = parts[parts.length - hops]!;
  return isIP(candidate) ? candidate : null;
}

export function trustedProxyHops(): number {
  const n = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : 0;
}

export function requestMeta(req: Request) {
  return { ip: clientIp(req.headers), userAgent: req.headers.get("user-agent")?.slice(0, 400) ?? null };
}

export async function readJson(req: Request, maxBytes = 16_384): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes)
    throw new ZodError([
      { code: "too_big", path: [], message: "body too large", origin: "string", maximum: maxBytes, inclusive: true },
    ]);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ZodError([{ code: "custom", path: [], message: "invalid JSON" }]);
  }
}

export function withCookies(res: NextResponse, cookies: CookieSpec[]) {
  for (const c of cookies) res.cookies.set(c.name, c.value, c.options);
  return res;
}

export function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export const noStore = { "cache-control": "no-store" } as const;
