/**
 * Route Handler helpers: JSON errors with stable codes (the UI maps `code` → messages/*.json
 * "errors.*"), CSRF origin check, request metadata, cookies.
 */
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

/** Client IP: first X-Forwarded-For hop set by OUR proxy (configure the trusted proxy in P7). */
export function requestMeta(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  const ip = (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim() || null;
  return { ip: ip && ip.length <= 64 ? ip : null, userAgent: req.headers.get("user-agent") };
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
