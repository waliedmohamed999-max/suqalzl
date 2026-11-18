import { NextResponse } from "next/server";
import { revokeSession, sessionCookieName, tokenFromRequest } from "@/lib/auth/session";
import { assertSameOrigin, clearCookie, handleError, noStore } from "@/lib/http";

export const runtime = "nodejs";

/** POST → 200 { ok } and the session is revoked server-side (not just the cookie). */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const token = tokenFromRequest(req);
    if (token) await revokeSession(token);
    return clearCookie(NextResponse.json({ ok: true }, { headers: noStore }), sessionCookieName());
  } catch (e) {
    return handleError(e);
  }
}
