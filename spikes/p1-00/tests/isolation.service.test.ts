import { beforeAll, describe, expect, it } from "vitest";
import { customerScope, vendorScope } from "@/features/negotiation/service";
import { NotFoundError, withCtx } from "@/lib/context";
import { customerSession, FLOOR_A, seed, truncateAll, vendorSession, type Seed } from "./helpers";

/**
 * Layer 1 — service layer. Vendor A uses B's ids everywhere; every call must behave exactly
 * like "does not exist". Also: identity in the input is rejected (strict Zod).
 */
let s: Seed;
let requestId: string;
let threadB: string;
let offerB: string;

beforeAll(async () => {
  await truncateAll();
  s = await seed();
  const r = await customerScope(customerSession(s, 1)).createRequest({ variantId: s.variantA, qty: 1, targetPrice: 160_000 });
  requestId = r.requestId;
  const o = await vendorScope(vendorSession(s, "B")).submitOffer({
    requestId,
    variantId: s.variantB,
    unitPrice: 170_000,
    qty: 1,
    shippingFee: 3_000,
  });
  threadB = o.threadId;
  offerB = o.offerId;
});

describe("service layer isolation (vendor A attacking vendor B)", () => {
  it("cannot read B's draft or published product for editing", async () => {
    const A = vendorScope(vendorSession(s, "A"));
    await expect(A.getProduct(s.productBDraft)).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.getProduct(s.productB)).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.getProduct(s.productA)).resolves.toMatchObject({ id: s.productA });
  });

  it("cannot update B's product price (no row changed)", async () => {
    const A = vendorScope(vendorSession(s, "A"));
    await expect(A.updateProductPrice({ productId: s.productB, basePrice: 1 })).rejects.toBeInstanceOf(NotFoundError);
    const p = await withCtx({ kind: "system" }, (tx) => tx.product.findUnique({ where: { id: s.productB } }));
    expect(p!.basePrice).toBe(195_000);
  });

  it("rejects vendorId smuggled in the input (strict schema)", async () => {
    const A = vendorScope(vendorSession(s, "A"));
    await expect(
      A.updateProductPrice({ productId: s.productB, basePrice: 1, vendorId: s.vendorB }),
    ).rejects.toThrow(/unrecognized|Unrecognized/);
  });

  it("cannot read B's secret thresholds", async () => {
    const A = vendorScope(vendorSession(s, "A"));
    await expect(A.getVariantNegotiation(s.variantB)).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.getVariantNegotiation(s.variantA)).resolves.toMatchObject({ floorPrice: FLOOR_A });
  });

  it("sees the request but never B's thread/offers; belowYourFloor only for owner", async () => {
    const dtoA = await vendorScope(vendorSession(s, "A")).getRequest(requestId);
    expect(dtoA.myThread).toBeNull();
    expect(dtoA.belowYourFloor).toBe(false); // 160,000 >= FLOOR_A — boolean only
    const json = JSON.stringify(dtoA);
    expect(json).not.toContain(threadB);
    expect(json).not.toContain(offerB);
    expect(json).not.toContain(s.vendorB);
    expect(json).not.toMatch(/floorPrice|autoAccept/);
    expect(json).not.toContain(String(FLOOR_A));

    const dtoB = await vendorScope(vendorSession(s, "B")).getRequest(requestId);
    expect(dtoB.belowYourFloor).toBeNull(); // competitor: not computed against A's variant
    expect(dtoB.myThread!.id).toBe(threadB);
  });

  it("vendor C (other category, not a recipient) cannot open the request at all", async () => {
    await expect(vendorScope(vendorSession(s, "C")).getRequest(requestId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("cannot answer with another vendor's variant", async () => {
    const A = vendorScope(vendorSession(s, "A"));
    await expect(
      A.submitOffer({ requestId, variantId: s.variantB, unitPrice: 100_000, qty: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("customer 2 cannot read or act on customer 1's request", async () => {
    const C2 = customerScope(customerSession(s, 2));
    await expect(C2.getRequest(requestId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(C2.counterOffer({ threadId: threadB, unitPrice: 1 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(C2.acceptOffer({ offerId: offerB })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("global omit: a plain findMany never returns floorPrice/autoAcceptPrice/iban", async () => {
    const rows = await withCtx({ kind: "system" }, (tx) => tx.variantNegotiationSettings.findMany());
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r).not.toHaveProperty("floorPrice");
      expect(r).not.toHaveProperty("autoAcceptPrice");
    }
    const vendors = await withCtx({ kind: "system" }, (tx) => tx.vendor.findMany());
    for (const v of vendors) expect(v).not.toHaveProperty("iban");
  });

  it("customer DTO lists all offers on own request, with no thresholds", async () => {
    const dto = await customerScope(customerSession(s, 1)).getRequest(requestId);
    expect(dto.threads.map((t) => t.id)).toEqual([threadB]);
    const json = JSON.stringify(dto);
    expect(json).not.toMatch(/floorPrice|autoAcceptPrice|belowYourFloor|iban/);
    expect(json).not.toContain(String(FLOOR_A));
  });
});

