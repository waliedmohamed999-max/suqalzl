import { NextResponse } from "next/server";
import { staffTwoFactorInput } from "@/features/auth/schema";
import { verifyStaffTwoFactor } from "@/lib/auth/service";
import { tokenFromRequest } from "@/lib/auth/session";
import { assertSameOrigin, handleError, noStore, readJson, requestMeta, withCookies } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST { code, rememberDevice } with the PENDING session cookie → 200 { ok, area } + new session cookie
 * (+ trusted-device cookie for 30 days when rememberDevice). 401 TWO_FACTOR_REQUIRED · 400/423 OTP_*.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = staffTwoFactorInput.parse(await readJson(req));
    const r = await verifyStaffTwoFactor({ sessionToken: tokenFromRequest(req), ...input }, requestMeta(req));
    return withCookies(NextResponse.json({ ok: true, area: r.area }, { headers: noStore }), r.cookies);
  } catch (e) {
    return handleError(e);
  }
}
