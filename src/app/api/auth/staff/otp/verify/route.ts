import { NextResponse } from "next/server";
import { staffOtpVerifyInput } from "@/features/auth/schema";
import { verifyStaffLoginOtp } from "@/lib/auth/service";
import { assertSameOrigin, handleError, noStore, readJson, requestMeta, withCookies } from "@/lib/http";

export const runtime = "nodejs";

/** POST { phone, code, vendorId? } → 200 { ok, requires2fa:false, area } + cookie. Only when staffLoginMethod = PHONE_OTP. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = staffOtpVerifyInput.parse(await readJson(req));
    const r = await verifyStaffLoginOtp(input, requestMeta(req));
    return withCookies(NextResponse.json({ ok: true, requires2fa: false, area: r.area }, { headers: noStore }), r.cookies);
  } catch (e) {
    return handleError(e);
  }
}
