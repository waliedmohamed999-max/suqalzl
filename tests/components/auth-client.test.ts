import { describe, expect, it } from "vitest";
import { errorMessageKey, safeNext } from "@/features/auth/client";
import ar from "@/messages/ar.json";

describe("safeNext (open-redirect guard)", () => {
  it.each([
    ["/account/orders", "/account/orders"],
    ["/en/account", "/en/account"],
    ["//evil.example", null],
    ["https://evil.example", null],
    ["/\\evil.example", null],
    ["javascript:alert(1)", null],
    ["", null],
    [null, null],
  ])("%s → %s", (input, out) => {
    expect(safeNext(input)).toBe(out);
  });

  it("restricts staff redirects to their own area", () => {
    expect(safeNext("/admin/orders?x=1", ["/admin"])).toBe("/admin/orders?x=1");
    expect(safeNext("/vendor", ["/admin"])).toBeNull();
    expect(safeNext("/administrator", ["/admin"])).toBeNull();
  });
});

describe("errorMessageKey", () => {
  it("maps every backend AuthErrorCode to an existing errors.* message", () => {
    const codes = [
      "INVALID_PHONE",
      "RATE_LIMITED",
      "OTP_INVALID",
      "OTP_EXPIRED",
      "OTP_LOCKED",
      "INVALID_CREDENTIALS",
      "ACCOUNT_BLOCKED",
      "LOGIN_METHOD_DISABLED",
      "TWO_FACTOR_REQUIRED",
      "TWO_FACTOR_UNAVAILABLE",
      "NO_VENDOR_ACCESS",
      "VALIDATION",
      "FORBIDDEN",
      "UNAUTHORIZED",
      "NETWORK",
      "INTERNAL",
      "SOMETHING_NEW",
    ];
    for (const c of codes) expect((ar.errors as Record<string, string>)[errorMessageKey(c)], c).toBeTruthy();
  });
});
