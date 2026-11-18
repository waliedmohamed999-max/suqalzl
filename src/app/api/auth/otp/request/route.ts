import { NextResponse } from "next/server";
import { otpRequestInput } from "@/features/auth/schema";
import { requestCustomerOtp } from "@/lib/auth/service";
import { assertSameOrigin, handleError, noStore, readJson, requestMeta } from "@/lib/http";

export const runtime = "nodejs";

/** POST { phone, locale } → 200 { ok, expiresInSeconds } | 400 INVALID_PHONE | 429 RATE_LIMITED */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input = otpRequestInput.parse(await readJson(req));
    const r = await requestCustomerOtp(input, requestMeta(req));
    return NextResponse.json({ ok: true, expiresInSeconds: r.expiresInSeconds }, { headers: noStore });
  } catch (e) {
    return handleError(e);
  }
}
