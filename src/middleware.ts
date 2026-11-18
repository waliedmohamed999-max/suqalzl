import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // D29: dashboards are Arabic-only at launch.
  const en = /^\/en(\/(admin|vendor)(\/.*)?)$/.exec(pathname);
  if (en?.[1]) return NextResponse.redirect(new URL(`${en[1]}${search}`, req.url));
  return intl(req);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
