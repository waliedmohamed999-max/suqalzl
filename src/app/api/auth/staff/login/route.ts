import { NextResponse } from "next/server";
import { staffLoginInput } from "@/features/auth/schema";
import { staffPasswordLogin } from "@/lib/auth/service";
import { deviceCookieName, readCookie } from "@/lib/auth/session";
import { assertSameOrigin, handleError, noStore, readJson, requestMeta, withCookies } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST { email, password, vendorId? } → 200 { ok, requires2fa, area } + session cookie (D31)
 * 401 INVALID_CREDENTIALS · 403 ACCOUNT_BLOCKED | LOGIN_METHOD_DISABLED | NO_VENDOR_ACCESS · 429 RATE_LIMITED
 * When requires2fa = true the cookie holds a PENDING session (10 min) usable only by /2fa/verify.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = staffLoginInput.parse(await readJson(req));
    const deviceToken = readCookie(req.headers.get("cookie"), deviceCookieName());
    const r = await staffPasswordLogin({ ...input, deviceToken }, requestMeta(req));
    return withCookies(
      NextResponse.json({ ok: true, requires2fa: r.requires2fa, area: r.area }, { headers: noStore }),
      r.cookies,
    );
  } catch (e) {
    return handleError(e);
  }
}
