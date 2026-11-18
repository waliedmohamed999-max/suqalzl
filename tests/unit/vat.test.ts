import { describe, expect, it } from "vitest";
import { applyBps, allocateLargestRemainder } from "@/lib/money";
import { grossOfNet, netOfGross, splitGross, vatOfGross, vatOnNet } from "@/lib/vat";

describe("VAT helpers (SPEC 6.1, finance.md 6.1)", () => {
  it("1,150.00 inclusive -> VAT 150.00, net 1,000.00", () => {
    expect(vatOfGross(115_000)).toBe(15_000);
    expect(netOfGross(115_000)).toBe(100_000);
    expect(vatOnNet(90_000)).toBe(13_500);
    expect(grossOfNet(100_000)).toBe(115_000);
  });
  it("rounds half up", () => {
    expect(vatOfGross(95_000)).toBe(12_391); // 12391.30
    expect(vatOfGross(23)).toBe(3); // 3.0
    expect(vatOfGross(115)).toBe(15);
    expect(vatOfGross(4)).toBe(1); // 0.5217 -> 1
    expect(vatOnNet(10)).toBe(2); // 1.5 -> 2
    expect(vatOnNet(74_348)).toBe(11_152); // 11152.2
  });
  it("net + vat === gross for every amount (no lost halala)", () => {
    for (let g = 0; g < 20_000; g += 7) {
      const { net, vat } = splitGross(g);
      expect(net + vat).toBe(g);
    }
  });
  it("custom rate and invalid rates", () => {
    expect(vatOfGross(110, 1000)).toBe(10);
    expect(() => vatOfGross(100, -1)).toThrow(RangeError);
    expect(() => vatOfGross(100, 1.5)).toThrow(RangeError);
    expect(() => vatOfGross(1.5)).toThrow(TypeError);
  });
});

/** finance.md §8 — the vendor formula built from the P1 primitives (full ledger tests in P4). */
function settle(o: {
  itemsGross: number;
  vendorDiscount?: number;
  rateBps?: number;
  feeShare?: number;
  selfShipGross?: number;
  registered: boolean;
}) {
  const commissionBaseNet = netOfGross(o.itemsGross - (o.vendorDiscount ?? 0));
  const commissionAmount = applyBps(commissionBaseNet, o.rateBps ?? 1000);
  const shippingNetToVendor = o.selfShipGross ? netOfGross(o.selfShipGross) : 0;
  const vendorNet = commissionBaseNet - commissionAmount - (o.feeShare ?? 0) + shippingNetToVendor;
  const vendorVat = o.registered ? vatOnNet(vendorNet) : 0;
  return { commissionBaseNet, commissionAmount, vendorNet, vendorVat, vendorPayable: vendorNet + vendorVat };
}

describe("finance.md TC1–TC8 with the P1 primitives", () => {
  it("TC1 mada, platform bears fees", () => {
    expect(settle({ itemsGross: 115_000, registered: false })).toMatchObject({
      commissionBaseNet: 100_000,
      commissionAmount: 10_000,
      vendorPayable: 90_000,
    });
    expect(settle({ itemsGross: 115_000, registered: true })).toMatchObject({
      vendorVat: 13_500,
      vendorPayable: 103_500,
    });
  });
  it("TC3 vendor coupon 10%", () => {
    const r = settle({ itemsGross: 115_000, vendorDiscount: 11_500, registered: true });
    expect(r).toEqual({
      commissionBaseNet: 90_000,
      commissionAmount: 9000,
      vendorNet: 81_000,
      vendorVat: 12_150,
      vendorPayable: 93_150,
    });
  });
  it("TC4 self shipping 3000", () => {
    expect(settle({ itemsGross: 115_000, selfShipGross: 3000, registered: false }).vendorNet).toBe(92_609);
    expect(settle({ itemsGross: 115_000, selfShipGross: 3000, registered: true })).toMatchObject({
      vendorVat: 13_891,
      vendorPayable: 106_500,
    });
    expect(vatOfGross(118_000)).toBe(15_391);
  });
  it("TC5 Tabby, vendor bears 6000 net fee", () => {
    expect(settle({ itemsGross: 115_000, feeShare: 6000, registered: true })).toMatchObject({
      vendorNet: 84_000,
      vendorVat: 12_600,
      vendorPayable: 96_600,
    });
  });
  it("TC6 two vendors, public coupon, Tabby fee 9000", () => {
    const [feeA, feeB] = allocateLargestRemainder(9000, [103_500, 31_050]);
    const a = settle({ itemsGross: 115_000, feeShare: feeA, registered: true });
    const b = settle({ itemsGross: 34_500, feeShare: feeB, registered: true });
    expect([a.vendorNet, b.vendorNet]).toEqual([83_077, 24_923]);
    expect([a.vendorVat, b.vendorVat]).toEqual([12_462, 3738]);
    expect(vatOfGross(103_500) + vatOfGross(31_050)).toBe(17_550);
  });
  it("TC7 negotiation 950 SAR, O7 = same commission", () => {
    expect(settle({ itemsGross: 95_000, registered: false })).toMatchObject({
      commissionBaseNet: 82_609,
      commissionAmount: 8261,
      vendorNet: 74_348,
    });
    expect(settle({ itemsGross: 95_000, registered: true })).toMatchObject({
      vendorVat: 11_152,
      vendorPayable: 85_500,
    });
  });
  it("TC8 Tamara 5000 net fee on the 950 deal", () => {
    expect(settle({ itemsGross: 95_000, feeShare: 5000, registered: true })).toMatchObject({
      vendorNet: 69_348,
      vendorVat: 10_402,
      vendorPayable: 79_750,
    });
  });
  it("TC10 recompute-and-diff on refund keeps the halala", () => {
    const full = settle({ itemsGross: 3 * 95_000, registered: true });
    const left = settle({ itemsGross: 2 * 95_000, registered: true });
    expect(full.vendorNet - left.vendorNet).toBe(74_348);
    expect(full.vendorPayable - left.vendorPayable).toBe(85_500);
  });
});
