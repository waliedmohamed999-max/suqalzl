import { describe, expect, it } from "vitest";
import { CONTACT_MASK, sanitizeNote, scanContact } from "@/lib/contact-filter";
import { toLatinDigits } from "@/lib/format/digits";

describe("contact-sharing filter (SPEC 6.8, E2E scenario 11)", () => {
  it.each([
    ["كلمني على ٠٥٥١٢٣٤٥٦٧", "PHONE"],
    ["رقمي 0551234567", "PHONE"],
    ["+966 55 123 4567", "PHONE"],
    ["٠٥٥-١٢٣-٤٥٦٧ واتس", "PHONE"],
    ["۰۵۵۱۲۳۴۵۶۷", "PHONE"],
    ["00966551234567", "PHONE"],
    ["0 5 5 1 2 3 4 5 6 7", "PHONE"],
    ["wa.me/966551234567", "WHATSAPP"],
    ["https://chat.whatsapp.com/abc", "WHATSAPP"],
    ["t.me/mystore", "TELEGRAM"],
    ["@insta", "HANDLE"],
    ["تابعني @my.store_sa", "HANDLE"],
    ["ايميلي ali@gmail.com", "EMAIL"],
    ["ali at gmail dot com", "EMAIL"],
    ["ali [at] gmail [dot] com", "EMAIL"],
    ["www.mystore.com", "URL"],
    ["زور متجري mystore.sa", "URL"],
    ["https://example.org/x", "URL"],
    ["كلمني واتساب", "SOCIAL"],
    ["سناب شات حقي", "SOCIAL"],
    ["تابعني انستقرام", "SOCIAL"],
    ["my snapchat is x", "SOCIAL"],
  ])("detects %s", (text, reason) => {
    const r = scanContact(text);
    expect(r.hasContact).toBe(true);
    expect(r.reasons).toContain(reason);
  });

  it.each([
    "السعر 950 ريال والشحن 25",
    "أقدر أوفر لك 1,250.00 ر.س شامل الضريبة",
    "التوصيل خلال 3 أيام إن شاء الله",
    "مقاس 56 لون أسود",
    "instant delivery",
    "الكمية 2 والسعر ١٢٠٠",
    "",
  ])("does not flag normal offer text: %s", (text) => {
    expect(scanContact(text).hasContact).toBe(false);
  });

  it("masks every span, keeps the rest, and reports reasons for ModerationFlag", () => {
    const r = sanitizeNote("السعر 950 وكلمني على ٠٥٥١٢٣٤٥٦٧ أو ali@gmail.com");
    expect(r.sanitized).toBe(`السعر 950 وكلمني على ${CONTACT_MASK} أو ${CONTACT_MASK}`);
    expect(r.reasons.sort()).toEqual(["EMAIL", "PHONE"]);
    expect(sanitizeNote("نص عادي")).toEqual({ sanitized: "نص عادي", reasons: [] });
    expect(sanitizeNote(null)).toEqual({ sanitized: "", reasons: [] });
  });

  it("toLatinDigits keeps string length (span indices are reused on the original text)", () => {
    const s = "٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹ ١٫٥";
    expect(toLatinDigits(s)).toBe("0123456789 0123456789 1.5");
    expect(toLatinDigits(s).length).toBe(s.length);
  });
});
