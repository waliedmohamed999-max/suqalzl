import { describe, expect, it } from "vitest";
import { effectiveDisplay, RIYAL_SIGN } from "@/lib/format/money";
import {
  allocateLargestRemainder,
  applyBps,
  divRoundHalfUp,
  formatSAR,
  formatSARParts,
  mulDivRoundHalfUp,
  RIYAL_SIGN_READY,
  sumHalalas,
  toDecimalString,
  toHalalas,
} from "@/lib/money";

describe("ROUND_HALF_UP integer division", () => {
  it.each([
    [5, 2, 3], // 2.5 -> 3
    [3, 2, 2], // 1.5 -> 2
    [7, 3, 2], // 2.33 -> 2
    [8, 3, 3], // 2.67 -> 3
    [-5, 2, -3], // half away from zero
    [-7, 3, -2],
    [0, 7, 0],
  ])("%i / %i = %i", (n, d, q) => expect(divRoundHalfUp(n, d)).toBe(q));

  it("is exact far beyond float precision (BigInt intermediates)", () => {
    // 9e15 * 15 overflows 2^53 as a float product; result must still be exact
    expect(mulDivRoundHalfUp(9_000_000_000_000_000 / 10, 15, 115)).toBe(117_391_304_347_826);
  });

  it("rejects division by zero and non-integers", () => {
    expect(() => divRoundHalfUp(1, 0)).toThrow(RangeError);
    expect(() => applyBps(10.5, 1000)).toThrow(TypeError);
    expect(() => applyBps(100, 10.5)).toThrow(TypeError);
  });

  it("applyBps: 10% commission on 100000 = 10000; 12% on 82609 = 9913 (finance TC7-B)", () => {
    expect(applyBps(100_000, 1000)).toBe(10_000);
    expect(applyBps(82_609, 1000)).toBe(8_261);
    expect(applyBps(82_609, 1200)).toBe(9_913);
  });
});

describe("largest-remainder allocation (finance TC6, backend H12)", () => {
  it("TC6: gateway fee 9000 over paid 103500 / 31050 -> 6923 / 2077", () => {
    expect(allocateLargestRemainder(9000, [103_500, 31_050])).toEqual([6923, 2077]);
  });
  it("TC6: public coupon 14950 over 115000 / 34500 -> 11500 / 3450", () => {
    expect(allocateLargestRemainder(14_950, [115_000, 34_500])).toEqual([11_500, 3450]);
  });
  it("always sums exactly, deterministic ties, negatives and zero weights", () => {
    const parts = allocateLargestRemainder(100, [1, 1, 1]);
    expect(parts).toEqual([34, 33, 33]);
    expect(sumHalalas(parts)).toBe(100);
    expect(allocateLargestRemainder(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
    expect(allocateLargestRemainder(0, [0, 0])).toEqual([0, 0]);
    expect(() => allocateLargestRemainder(5, [0, 0])).toThrow(RangeError);
    for (let t = 0; t < 500; t++) {
      const w = [17 + t, 3 * t + 1, 999];
      expect(allocateLargestRemainder(t * 7 + 1, w).reduce((a, b) => a + b, 0)).toBe(t * 7 + 1);
    }
  });
});

describe("toHalalas (customer input in riyals, API in halalas)", () => {
  it.each([
    ["1250", 125_000],
    ["1,250.50", 125_050],
    ["1250.5", 125_050],
    ["0.01", 1],
    ["١٢٥٠٫٥", 125_050],
    ["۹۰۰", 90_000],
    [" 900 ", 90_000],
  ])("%s -> %i", (input, h) => expect(toHalalas(input)).toBe(h));
  it("integers and 2-decimal numbers", () => {
    expect(toHalalas(950)).toBe(95_000);
    expect(toHalalas(0.1)).toBe(10);
    expect(toHalalas(19.99)).toBe(1999);
  });
  it.each(["12.345", "abc", "", "1e3", "--1", "1.2.3"])("rejects %s", (bad) =>
    expect(() => toHalalas(bad)).toThrow(RangeError),
  );
});

describe("formatSAR (tokens.md 8.4.7, D25)", () => {
  it("text (default): ar '1,250.00 ر.س', en 'SAR 1,250.00'", () => {
    expect(formatSAR(125_000, { locale: "ar" })).toBe("1,250.00 ر.س");
    expect(formatSAR(125_000, { locale: "en" })).toBe("SAR 1,250.00");
  });
  it("code: SAR in both languages", () => {
    expect(formatSAR(125_000, { locale: "ar", display: "code" })).toBe("1,250.00 SAR");
    expect(formatSAR(125_000, { locale: "en", display: "code" })).toBe("SAR 1,250.00");
  });
  it("symbol degrades to text while RIYAL_SIGN_READY = false", () => {
    expect(RIYAL_SIGN_READY).toBe(false);
    expect(effectiveDisplay("symbol")).toBe("text");
    expect(formatSAR(125_000, { locale: "ar", display: "symbol" })).toBe("1,250.00 ر.س");
    expect(formatSAR(125_000, { locale: "ar", display: "symbol" })).not.toContain(RIYAL_SIGN);
  });
  it("negatives use U+2212 and latin digits; small and big amounts", () => {
    expect(formatSARParts(-15_000, { locale: "ar" })).toEqual({ amount: "−150.00", amountIsNegative: true });
    expect(formatSAR(5, { locale: "ar" })).toBe("0.05 ر.س");
    expect(formatSAR(2_500_000_00, { locale: "en" })).toBe("SAR 2,500,000.00");
    expect(formatSAR(4500, { locale: "ar" })).not.toMatch(/[٠-٩]/);
  });
  it("compact for dashboards keeps the currency", () => {
    expect(formatSAR(48_620_000, { locale: "en", compact: true })).toBe("SAR 486.2K");
    expect(formatSAR(48_620_000, { locale: "ar", compact: true })).toMatch(/^486\.2 ألف ر\.س$/);
  });
  it("toDecimalString for JSON-LD/CSV", () => {
    expect(toDecimalString(125_000)).toBe("1250.00");
    expect(toDecimalString(7)).toBe("0.07");
    expect(toDecimalString(-150)).toBe("-1.50");
  });
  it("refuses floats (D7)", () => {
    expect(() => formatSAR(12.5, { locale: "ar" })).toThrow(TypeError);
  });
});
