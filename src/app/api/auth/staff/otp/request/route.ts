import { NextResponse } from "next/server";
import { staffOtpRequestInput } from "@/features/auth/schema";
import { requestStaffLoginOtp } from "@/lib/auth/service";
import { assertSameOrigin, handleError, noStore, readJson, requestMeta } from "@/lib/http";

export const runtime = "nodejs";

/** POST { phone } → 200 (always, unknown phones included) | 403 LOGIN_METHOD_DISABLED | 429. Only when staffLoginMethod = PHONE_OTP. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = staffOtpRequestInput.parse(await readJson(req));
    const r = await requestStaffLoginOtp(input, requestMeta(req));
    return NextResponse.json({ ok: true, expiresInSeconds: r.expiresInSeconds }, { headers: noStore });
  } catch (e) {
    return handleError(e);
  }
}
