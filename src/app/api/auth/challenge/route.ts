import { NextResponse } from "next/server";
import { withCtx } from "@/lib/db";
import { assertSameOrigin, handleError, noStore } from "@/lib/http";
import { captchaProvider } from "@/lib/providers/captcha";

export const runtime = "nodejs";

/**
 * POST → 200 { provider: "POW", token, difficultyBits, expiresAt, algorithm } (D36-2, O15 pending).
 * Asked for after a 428 CHALLENGE_REQUIRED from /api/auth/otp/request, /api/auth/staff/login or
 * /api/auth/staff/otp/request; the answer goes back as `captcha: { token, solution }`.
 * Stateless (HMAC-signed) and cheap: no rate limit needed here; tokens are single-use.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const c = await withCtx({ kind: "system", reason: "auth.challenge.issue" }, (tx) => captchaProvider().issue(tx));
    return NextResponse.json(c, { headers: noStore });
  } catch (e) {
    return handleError(e);
  }
}
