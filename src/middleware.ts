import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

// Cookie names mirror src/lib/auth/session.ts (kept literal: middleware must stay edge-safe).
const SESSION_COOKIES = ["__Host-szl_session", "szl_session"];

/**
 * 1. D29: /en/admin and /en/vendor → Arabic.
 * 2. Protected areas (/admin, /vendor, /account, with or without /en): no session cookie → login,
 *    with ?next= for the return path. This is only a fast pre-check; the layouts call requireArea()
 *    which validates the session and role in the database on every request.
 * 3. next-intl locale routing.
 */
export default function middleware(req: NextRequest) {
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
  return intl(req);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
