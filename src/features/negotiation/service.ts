import { reserve } from "@/features/inventory/reservations";
import { asSystem, ForbiddenError, NotFoundError, withCtx, type Ctx } from "@/lib/db";
import { publish, topics } from "@/lib/providers/realtime";
import {
  acceptOfferInput,
  counterOfferInput,
  createRequestInput,
  priceRequestCustomerDTO,
  priceRequestVendorDTO,
  submitOfferInput,
  updatePriceInput,
  type PriceRequestCustomerDTO,
  type PriceRequestVendorDTO,
} from "./schema";

/**
 * P1-00 REFERENCE implementation of the negotiation engine, ported to the full schema so the
 * isolation (scenario 5/8) and realtime tests run against real tables. NOT feature-complete:
 * P4.5-04 adds the state machine, D22 limits, rounds, auto-accept with random delay, expiry, PriceLock.
 *
 * PRIMARY isolation layer (backend.md C2-a): every query below filters by the id taken from the
 * session (`s.vendorId` / `s.userId`). RLS (0003) is the second layer underneath.
 * Not found and not yours return the SAME error (no existence oracle).
 */

const PRICE_LOCK_SECONDS = 24 * 3600;

const iso = (d: Date) => d.toISOString();

// ------------------------------------------------------------------ vendor scope
type VendorCtx = Extract<Ctx, { kind: "vendor" }>;
type CustomerCtx = Extract<Ctx, { kind: "customer" }>;

export function vendorScope(s: VendorCtx) {
  const ctx: Ctx = s;

  return {
    async getProduct(productId: string) {
      return withCtx(ctx, async (tx) => {
        const p = await tx.product.findFirst({ where: { id: productId, vendorId: s.vendorId } });
        if (!p) throw new NotFoundError();
        return p;
      });
    },

    async updateProductPrice(raw: unknown) {
      const input = updatePriceInput.parse(raw);
      return withCtx(ctx, async (tx) => {
        const r = await tx.product.updateMany({
          where: { id: input.productId, vendorId: s.vendorId },
          data: { basePrice: input.basePrice },
        });
        if (r.count === 0) throw new NotFoundError();
      });
    },

    /** Owner reads his own secret thresholds (settings page / previewOffer). */
    async getVariantNegotiation(variantId: string) {
      return withCtx(ctx, async (tx) => {
        const v = await tx.variantNegotiationSettings.findFirst({
          where: { variantId, variant: { product: { vendorId: s.vendorId } } },
          omit: { floorPrice: false, autoAcceptPrice: false },
        });
        if (!v) throw new NotFoundError();
        return v;
      });
    },

    async listInbox() {
      return withCtx(ctx, (tx) =>
        tx.priceRequestRecipient.findMany({
          where: { vendorId: s.vendorId },
          select: { requestId: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
      );
    },

    async getRequest(requestId: string): Promise<PriceRequestVendorDTO> {
      return withCtx(ctx, async (tx) => {
        const rec = await tx.priceRequestRecipient.findFirst({ where: { requestId, vendorId: s.vendorId } });
        if (!rec) throw new NotFoundError();
        const r = await tx.priceRequest.findFirst({ where: { id: requestId } });
        if (!r) throw new NotFoundError();

        let belowYourFloor: boolean | null = null;
        if (r.variantId) {
          const mine = await tx.variantNegotiationSettings.findFirst({
            where: { variantId: r.variantId, variant: { product: { vendorId: s.vendorId } } },
            omit: { floorPrice: false },
          });
          if (mine) belowYourFloor = r.targetPrice < mine.floorPrice; // the value itself never leaves
        }
        const thread = await tx.negotiationThread.findFirst({
          where: { requestId, vendorId: s.vendorId },
          include: { offers: { orderBy: { createdAt: "asc" } } },
        });
        return priceRequestVendorDTO.parse({
          id: r.id,
          number: r.number,
          type: r.type,
          titleAr: r.titleAr,
          qty: r.qty,
          targetPrice: r.targetPrice,
          status: r.status,
          expiresAt: iso(r.expiresAt),
          belowYourFloor,
          myThread: thread
            ? {
                id: thread.id,
                status: thread.status,
                version: thread.version,
                offers: thread.offers.map((o) => ({
                  id: o.id,
                  author: o.author,
                  round: o.round,
                  unitPrice: o.unitPrice,
                  qty: o.qty,
                  shippingFee: o.shippingFee,
                  status: o.status,
                  createdAt: iso(o.createdAt),
                })),
              }
            : null,
        });
      });
    },

    async submitOffer(raw: unknown) {
      const input = submitOfferInput.parse(raw);
      return withCtx(ctx, async (tx) => {
        const rec = await tx.priceRequestRecipient.findFirst({
          where: { requestId: input.requestId, vendorId: s.vendorId },
        });
        if (!rec) throw new NotFoundError();
        // Vendor may only answer with his own published variant (SPEC 6.8 "حدود التاجر").
        const variant = await tx.productVariant.findFirst({
          where: { id: input.variantId, isActive: true, product: { vendorId: s.vendorId, status: "PUBLISHED" } },
        });
        if (!variant) throw new NotFoundError();
        if (input.qty > variant.stock - variant.reservedStock) throw new ForbiddenError();

        const thread =
          (await tx.negotiationThread.findFirst({ where: { requestId: input.requestId, vendorId: s.vendorId } })) ??
          (await tx.negotiationThread.create({
            data: {
              requestId: input.requestId,
              vendorId: s.vendorId,
              productId: variant.productId,
              variantId: input.variantId,
            },
          }));
        const offer = await tx.priceOffer.create({
          data: {
            threadId: thread.id,
            requestId: input.requestId,
            vendorId: s.vendorId,
            productId: variant.productId,
            variantId: input.variantId,
            author: "VENDOR",
            round: thread.vendorRounds + 1,
            unitPrice: input.unitPrice,
            qty: input.qty,
            shippingFee: input.shippingFee,
            etaDays: input.etaDays,
            expiresAt: new Date(Date.now() + 24 * 3600_000),
          },
        });
        const t2 = await tx.negotiationThread.update({
          where: { id: thread.id },
          data: { vendorRounds: { increment: 1 }, version: { increment: 1 } },
        });
        await tx.priceRequestRecipient.update({ where: { id: rec.id }, data: { status: "RESPONDED" } });
        // Vendor cannot write price_requests (RLS: SELECT only) -> explicit privileged step.
        const req = await asSystem(tx, ctx, () =>
          tx.priceRequest.update({
            where: { id: input.requestId },
            data: { status: "HAS_OFFERS" },
            select: { status: true },
          }),
        );
        const ev = { requestId: input.requestId, threadId: thread.id, version: t2.version };
        await publish(tx, topics.prCustomer(input.requestId), "thread.changed", ev);
        await publish(tx, topics.prVendor(input.requestId, s.vendorId), "thread.changed", ev);
        await publish(tx, topics.prCustomer(input.requestId), "request.changed", {
          requestId: input.requestId,
          status: req.status,
          version: t2.version,
        });
        return { offerId: offer.id, threadId: thread.id };
      });
    },
  };
}

// ------------------------------------------------------------------ customer scope
export function customerScope(s: CustomerCtx) {
  const ctx: Ctx = s;

  return {
    /**
     * Same response shape/path whatever targetPrice is relative to floorPrice: floor is not even
     * read here (SPEC 6.8 — no oracle by response or timing).
     */
    async createRequest(raw: unknown) {
      const input = createRequestInput.parse(raw);
      return withCtx(ctx, async (tx) => {
        const v = await tx.productVariant.findFirst({
          where: { id: input.variantId, isActive: true, product: { status: "PUBLISHED" } },
          include: { product: { select: { id: true, vendorId: true, categoryId: true, nameAr: true } } },
        });
        if (!v) throw new NotFoundError();
        const r = await tx.priceRequest.create({
          data: {
            customerId: s.userId,
            type: "PRODUCT",
            productId: v.product.id,
            variantId: v.id,
            categoryId: v.product.categoryId,
            titleAr: v.product.nameAr,
            qty: input.qty,
            targetPrice: input.targetPrice,
            cityId: input.cityId,
            expiresAt: new Date(Date.now() + 48 * 3600_000),
          },
        });
        // Fan-out needs other vendors' rows -> privileged step.
        const recipients = await asSystem(tx, ctx, async () => {
          // SPEC 6.8 selectRecipients: APPROVED vendors allowed in the category (VendorCategory) with a
          // PUBLISHED product in it, not suspended from bargaining. Ranking by badges: P4.5-04.
          const vendors = await tx.vendor.findMany({
            where: {
              status: "APPROVED",
              OR: [{ bargainSuspendedUntil: null }, { bargainSuspendedUntil: { lt: new Date() } }],
              categories: { some: { categoryId: v.product.categoryId } },
              products: { some: { categoryId: v.product.categoryId, status: "PUBLISHED" } },
            },
            select: { id: true },
            orderBy: { createdAt: "asc" },
            take: 30, // D22 max recipients
          });
          const ids = new Set<string | null>(vendors.map((x) => x.id));
          ids.add(v.product.vendorId); // the product owner always (null = the platform, D6)
          await tx.priceRequestRecipient.createMany({
            data: [...ids].map((vendorId) => ({ requestId: r.id, vendorId })),
          });
          await tx.priceRequest.update({ where: { id: r.id }, data: { broadcastCount: ids.size } });
          return [...ids].filter((x): x is string => x !== null);
        });
        for (const vendorId of recipients) {
          await publish(tx, topics.vendorInbox(vendorId), "request.created", { requestId: r.id, version: 1 });
        }
        return { requestId: r.id, number: r.number, recipientsCount: recipients.length };
      });
    },

    async getRequest(requestId: string): Promise<PriceRequestCustomerDTO> {
      return withCtx(ctx, async (tx) => {
        const r = await tx.priceRequest.findFirst({
          where: { id: requestId, customerId: s.userId },
          include: {
            threads: {
              include: {
                vendor: { select: { storeNameAr: true } },
                offers: { orderBy: { createdAt: "asc" } },
              },
            },
          },
        });
        if (!r) throw new NotFoundError();
        return priceRequestCustomerDTO.parse({
          id: r.id,
          number: r.number,
          status: r.status,
          qty: r.qty,
          targetPrice: r.targetPrice,
          recipientsCount: r.broadcastCount,
          threads: r.threads.map((t) => ({
            id: t.id,
            store: { name: t.vendor?.storeNameAr ?? null, isPlatform: t.vendorId === null },
            status: t.status,
            version: t.version,
            offers: t.offers.map((o) => ({
              id: o.id,
              author: o.author,
              round: o.round,
              unitPrice: o.unitPrice,
              qty: o.qty,
              shippingFee: o.shippingFee,
              status: o.status,
              createdAt: iso(o.createdAt),
            })),
          })),
        });
      });
    },

    async counterOffer(raw: unknown) {
      const input = counterOfferInput.parse(raw);
      return withCtx(ctx, async (tx) => {
        const t = await tx.negotiationThread.findFirst({
          where: { id: input.threadId, request: { customerId: s.userId } },
          include: { offers: { where: { status: "PENDING", author: "VENDOR" } } },
        });
        const pending = t?.offers[0];
        if (!t || !pending) throw new NotFoundError();
        await tx.priceOffer.update({ where: { id: pending.id }, data: { status: "COUNTERED" } });
        await tx.priceOffer.create({
          data: {
            threadId: t.id,
            requestId: t.requestId,
            vendorId: t.vendorId,
            productId: pending.productId,
            variantId: pending.variantId,
            author: "CUSTOMER",
            round: t.customerRounds + 1,
            unitPrice: input.unitPrice,
            qty: pending.qty,
            shippingFee: pending.shippingFee,
            etaDays: pending.etaDays,
            expiresAt: pending.expiresAt,
          },
        });
        const t2 = await tx.negotiationThread.update({
          where: { id: t.id },
          data: { customerRounds: { increment: 1 }, version: { increment: 1 } },
        });
        const ev = { requestId: t.requestId, threadId: t.id, version: t2.version };
        await publish(tx, topics.prCustomer(t.requestId), "thread.changed", ev);
        if (t.vendorId) await publish(tx, topics.prVendor(t.requestId, t.vendorId), "thread.changed", ev); // that vendor only
      });
    },

    /** Accept -> PriceLock-style stock reservation in the same transaction (H10 + C3). */
    async acceptOffer(raw: unknown) {
      const input = acceptOfferInput.parse(raw);
      return withCtx(ctx, async (tx) => {
        const offer = await tx.priceOffer.findFirst({
          where: { id: input.offerId, author: "VENDOR", status: "PENDING", request: { customerId: s.userId } },
        });
        if (!offer) throw new NotFoundError();
        // H10: serialize concurrent accepts on the request row.
        await tx.$queryRaw`SELECT id FROM price_requests WHERE id = ${offer.requestId}::uuid FOR UPDATE`;
        const fresh = await tx.priceRequest.findFirst({ where: { id: offer.requestId } });
        if (!fresh || !["OPEN", "HAS_OFFERS"].includes(fresh.status)) throw new NotFoundError();

        const reservationIds = await asSystem(tx, ctx, () =>
          reserve(
            tx,
            [{ variantId: offer.variantId, qty: offer.qty }],
            { type: "PRICE_LOCK", id: offer.id },
            PRICE_LOCK_SECONDS,
          ),
        );
        await tx.priceOffer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } });
        await tx.priceRequest.update({ where: { id: offer.requestId }, data: { status: "ACCEPTED" } });
        const threads = await tx.negotiationThread.findMany({ where: { requestId: offer.requestId } });
        for (const t of threads) {
          const won = t.id === offer.threadId;
          const t2 = await tx.negotiationThread.update({
            where: { id: t.id },
            data: { status: won ? "ACCEPTED" : "CLOSED", version: { increment: 1 } },
          });
          if (!t.vendorId) continue; // platform thread: admin inbox (P4.5)
          if (won) {
            await publish(tx, topics.prVendor(offer.requestId, t.vendorId), "thread.changed", {
              requestId: offer.requestId,
              threadId: t.id,
              version: t2.version,
            });
          } else {
            // Losers learn only that the request closed — not who won, not the price.
            await publish(tx, topics.prVendor(offer.requestId, t.vendorId), "request.changed", {
              requestId: offer.requestId,
              status: "CLOSED",
              version: t2.version,
            });
          }
        }
        await publish(tx, topics.prCustomer(offer.requestId), "request.changed", {
          requestId: offer.requestId,
          status: "ACCEPTED",
          version: fresh.broadcastCount + 1,
        });
        return { reservationId: reservationIds[0]! };
      });
    },
  };
}
