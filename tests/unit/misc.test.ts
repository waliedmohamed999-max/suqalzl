import { describe, expect, it } from "vitest";
import { redactForAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decryptField, encryptField, needsReencryption } from "@/lib/crypto/field-encryption";
import { assertPaymentsSafety } from "@/lib/env";
import { isValidSaudiIban, maskIban } from "@/lib/iban";
import { scrubEvent, scrubString } from "@/lib/monitoring/scrub";
import { formatSaudiMobile, maskPhone, normalizeSaudiMobile } from "@/lib/phone";
import { ManualShippingProvider } from "@/lib/providers/shipping";
import { checkUpload, objectKey } from "@/lib/providers/storage";
import { renderSmsTemplate } from "@/lib/providers/sms/templates";
import { DEFAULT_SETTINGS, settingSchemas, type SettingKey } from "@/lib/settings";

describe("Saudi mobile (D23: +9665 only)", () => {
  it.each([
    ["0551234567", "+966551234567"],
    ["551234567", "+966551234567"],
    ["966551234567", "+966551234567"],
    ["00966551234567", "+966551234567"],
    ["+966 55 123 4567", "+966551234567"],
    ["٠٥٥١٢٣٤٥٦٧", "+966551234567"],
  ])("%s -> %s", (i, o) => expect(normalizeSaudiMobile(i)).toBe(o));
  it.each(["0112345678", "+971501234567", "05512345", "055123456789", "abc"])("rejects %s", (i) =>
    expect(normalizeSaudiMobile(i)).toBeNull(),
  );
  it("formats and masks", () => {
    expect(formatSaudiMobile("+966551234567")).toBe("055 123 4567");
    expect(maskPhone("+966551234567")).toBe("+9665******67");
  });
});

describe("IBAN (SPEC 6.5: SA + 22 digits + mod 97)", () => {
  it("valid and invalid", () => {
    expect(isValidSaudiIban("SA03 8000 0000 6080 1016 7519")).toBe(true);
    expect(isValidSaudiIban("sa0380000000608010167519")).toBe(true);
    expect(isValidSaudiIban("SA0380000000608010167518")).toBe(false); // checksum
    expect(isValidSaudiIban("SA038000000060801016751")).toBe(false); // length
    expect(isValidSaudiIban("AE070331234567890123456")).toBe(false);
    expect(maskIban("7519")).toBe("SA****7519");
  });
});

describe("password hashing (scrypt)", () => {
  it("hashes, verifies, rejects wrong/short/unknown", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong horse battery", h)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    await expect(hashPassword("short")).rejects.toThrow(RangeError);
  });
});

describe("field encryption (AES-256-GCM, key ids)", () => {
  it("round-trips, binds AAD, supports rotation", () => {
    const c = encryptField("SA0380000000608010167519", "vendor:1");
    expect(c.startsWith("v1:")).toBe(true);
    expect(c).not.toContain("SA03");
    expect(decryptField(c, "vendor:1")).toBe("SA0380000000608010167519");
    expect(() => decryptField(c, "vendor:2")).toThrow();
    const oldKey = process.env.FIELD_ENCRYPTION_KEY!;
    process.env.FIELD_ENCRYPTION_PREVIOUS_KEYS = `v1:${oldKey}`;
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    process.env.FIELD_ENCRYPTION_KEY_ID = "v2";
    try {
      expect(decryptField(c, "vendor:1")).toBe("SA0380000000608010167519");
      expect(needsReencryption(c)).toBe(true);
    } finally {
      process.env.FIELD_ENCRYPTION_KEY = oldKey;
      process.env.FIELD_ENCRYPTION_KEY_ID = "v1";
      delete process.env.FIELD_ENCRYPTION_PREVIOUS_KEYS;
    }
  });
});

describe("Sentry PII scrubbing (SPEC §2)", () => {
  it("strips phones (Latin + Arabic), e-mails, IBANs, bearer tokens", () => {
    const s = scrubString(
      "call 0551234567 or ٠٥٥١٢٣٤٥٦٧ / +966551234567, mail a@b.com, iban SA0380000000608010167519, Bearer abc.def",
    );
    expect(s).not.toMatch(/055|966|a@b\.com|SA03|abc\.def/);
    expect(s).toContain("[PHONE]");
    expect(s).toContain("[EMAIL]");
    expect(s).toContain("[IBAN]");
  });
  it("drops user and cookies, redacts sensitive keys and headers", () => {
    const e = scrubEvent({
      user: { id: "x", email: "a@b.com" },
      request: {
        cookies: { szl_session: "t" },
        headers: { authorization: "Bearer x", "user-agent": "ua" },
        data: { phone: "+966551234567", note: "hi" },
      },
      extra: { addressSnapshot: { street: "x" }, iban: "SA03..." },
      message: "failed for a@b.com",
    });
    expect(e.user).toBeUndefined();
    expect(e.request?.cookies).toBeUndefined();
    expect(e.request?.headers).toEqual({ authorization: "[REDACTED]", "user-agent": "ua" });
    expect(e.request?.data).toEqual({ phone: "[REDACTED]", note: "hi" });
    expect(e.extra).toEqual({ addressSnapshot: "[REDACTED]", iban: "[REDACTED]" });
    expect(e.message).toBe("failed for [EMAIL]");
  });
});

describe("settings defaults (D22, D27, D31, table O)", () => {
  it("every default validates against its schema", () => {
    for (const k of Object.keys(settingSchemas) as SettingKey[])
      expect(settingSchemas[k].safeParse(DEFAULT_SETTINGS[k]).success, k).toBe(true);
  });
  it("owner-pending values are the finance-zatca proposals", () => {
    expect(DEFAULT_SETTINGS.vatRate).toBe(1500);
    expect(DEFAULT_SETTINGS.defaultCommission).toBe(1000);
    expect(DEFAULT_SETTINGS.holdDays).toBe(7);
    expect(DEFAULT_SETTINGS.newVendorHoldDays).toBe(14);
    expect(DEFAULT_SETTINGS.payoutCycle).toBe("WEEKLY");
    expect(DEFAULT_SETTINGS.payoutWeekday).toBe("SUN");
    expect(DEFAULT_SETTINGS.minPayout).toBe(10_000);
    expect(DEFAULT_SETTINGS.gatewayFeeBearer).toEqual({
      MADA: "PLATFORM",
      CARD: "PLATFORM",
      APPLE_PAY: "PLATFORM",
      STC_PAY: "PLATFORM",
      TABBY: "VENDOR",
      TAMARA: "VENDOR",
    });
    expect(DEFAULT_SETTINGS.negotiationCommissionBps).toBeNull();
    expect(DEFAULT_SETTINGS.platformCouponApprovalBps).toBe(1000);
    expect(DEFAULT_SETTINGS.souqDiscountsRequireLicense).toBe(false);
    expect(DEFAULT_SETTINGS.allowNonResidentVendors).toBe(false);
    expect(DEFAULT_SETTINGS.staffLoginMethod).toBe("PASSWORD");
    expect(DEFAULT_SETTINGS.staffTwoFactorEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.negotiation).toMatchObject({
      maxOpenPerCustomer: 5,
      maxPerDay: 10,
      maxRecipients: 30,
      minTargetPctOfVariantBps: 5000,
    });
  });
});

describe("providers", () => {
  it("SMS templates: fixed text, at most 2 variables, Arabic OTP short", () => {
    const t = renderSmsTemplate("otp", { code: "123456" }, "ar");
    expect(t).toBe("رمز الدخول لسوق الزل: 123456");
    expect(t.length).toBeLessThanOrEqual(70); // one Arabic SMS segment (SPEC §8)
    expect(() => renderSmsTemplate("otp", { code: "1", other: "x" }, "ar")).toThrow();
    expect(() => renderSmsTemplate("otp", {}, "en")).toThrow();
  });
  it("manual shipping validates carrier and tracking number (D17)", async () => {
    const p = new ManualShippingProvider();
    await expect(
      p.createShipment({ subOrderId: "x", carrier: "SMSA", trackingNumber: " ab12345 " }),
    ).resolves.toMatchObject({ provider: "MANUAL", trackingNumber: "AB12345" });
    await expect(p.createShipment({ subOrderId: "x", carrier: "S", trackingNumber: "AB12345" })).rejects.toThrow();
    await expect(p.createShipment({ subOrderId: "x", carrier: "SMSA", trackingNumber: "<script>" })).rejects.toThrow();
    expect(await p.quote()).toBeNull();
  });
  it("upload policies and server-side keys", () => {
    expect(checkUpload("productImage", "image/webp", 1000).bucket).toBe("public");
    expect(() => checkUpload("productImage", "application/pdf", 1000)).toThrow(/TYPE/);
    expect(() => checkUpload("vendorDocument", "application/pdf", 50 * 1024 * 1024)).toThrow(/SIZE/);
    expect(objectKey("vendor-docs/../../etc", "p.d.f")).toMatch(/^vendor-docs\/etc\/[0-9a-f-]{36}\.pdf$/);
  });
  it("payments: live mode only in production, no live keys in sandbox (notes §6)", () => {
    expect(() => assertPaymentsSafety({ PAYMENTS_MODE: "live", APP_ENV: "staging" }, [])).toThrow();
    expect(() => assertPaymentsSafety({ PAYMENTS_MODE: "sandbox", APP_ENV: "development" }, ["sk_live_x"])).toThrow();
    expect(() => assertPaymentsSafety({ PAYMENTS_MODE: "live", APP_ENV: "production" }, ["sk_test_x"])).toThrow();
    expect(() =>
      assertPaymentsSafety({ PAYMENTS_MODE: "sandbox", APP_ENV: "development" }, ["sk_test_x"]),
    ).not.toThrow();
  });
  it("audit redaction", () => {
    expect(redactForAudit({ iban: "SA..", nested: { passwordHash: "x", ok: 1 }, list: [{ floorPrice: 5 }] })).toEqual({
      iban: "[REDACTED]",
      nested: { passwordHash: "[REDACTED]", ok: 1 },
      list: [{ floorPrice: "[REDACTED]" }],
    });
  });
});
