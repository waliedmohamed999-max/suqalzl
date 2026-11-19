import { NextResponse } from "next/server";
import { otpVerifyInput } from "@/features/auth/schema";
import { cartCookieName, mergeGuestCart } from "@/features/cart/service";
import { verifyCustomerOtp } from "@/lib/auth/service";
import { readCookie } from "@/lib/auth/session";
import { assertSameOrigin, clearCookie, handleError, noStore, readJson, requestMeta, withCookies } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST { phone, code, name?, locale } → 200 { ok, user, isNew } + session cookie
 * 400 OTP_INVALID | OTP_EXPIRED · 423 OTP_LOCKED · 403 ACCOUNT_BLOCKED
 * Mobile clients send `x-client: mobile` to receive { token } for `Authorization: Bearer`.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = otpVerifyInput.parse(await readJson(req));
    const r = await verifyCustomerOtp(input, requestMeta(req));
    const body = {
      ok: true,
      user: r.user,
      isNew: r.isNew,
      ...(req.headers.get("x-client") === "mobile" ? { token: r.token } : {}),
    };
    const res = withCookies(NextResponse.json(body, { headers: noStore }), r.cookies);
    // M1-02: the guest cart follows the customer after login (never fails the login itself)
    const guestCart = readCookie(req.headers.get("cookie"), cartCookieName());
    if (guestCart) {
      await mergeGuestCart(r.user.id, guestCart).catch((e) =>
        console.error("[cart] merge after login failed", e instanceof Error ? e.message : e),
      );
      clearCookie(res, cartCookieName());
    }
    return res;
  } catch (e) {
    return handleError(e);
  }
}
