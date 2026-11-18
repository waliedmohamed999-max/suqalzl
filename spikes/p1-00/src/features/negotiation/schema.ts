import { z } from "zod";

/**
 * Contracts (backend.md 5.6-2). INPUT schemas are .strict(): a client that sends vendorId /
 * customerId / floorPrice gets a validation error — identity is taken from the session only.
 * OUTPUT schemas are .strict() and every response is parsed before it leaves the server.
 */
const halalas = z.number().int().nonnegative();
const id = z.uuid();
const iso = z.iso.datetime();

// ---------------- inputs
export const createRequestInput = z
  .object({ variantId: id, qty: z.number().int().min(1).max(100), targetPrice: z.number().int().positive() })
  .strict();
export const submitOfferInput = z
  .object({
    requestId: id,
    variantId: id,
    unitPrice: z.number().int().positive(),
    qty: z.number().int().min(1),
    shippingFee: halalas.default(0),
  })
  .strict();
export const counterOfferInput = z.object({ threadId: id, unitPrice: z.number().int().positive() }).strict();
export const acceptOfferInput = z.object({ offerId: id }).strict();
export const updatePriceInput = z.object({ productId: id, basePrice: z.number().int().positive() }).strict();

// ---------------- outputs
export const offerVendorDTO = z
  .object({
    id,
    author: z.enum(["VENDOR", "CUSTOMER"]),
    round: z.number().int(),
    unitPrice: halalas,
    qty: z.number().int(),
    shippingFee: halalas,
    status: z.string(),
    createdAt: iso,
  })
  .strict();

export const priceRequestVendorDTO = z
  .object({
    id,
    number: z.string(),
    type: z.enum(["PRODUCT", "OPEN"]),
    titleAr: z.string(),
    qty: z.number().int(),
    targetPrice: halalas,
    status: z.string(),
    expiresAt: iso,
    /** true/false only for the owner of the requested variant; null for competitors (backend.md 5.6-2). */
    belowYourFloor: z.boolean().nullable(),
    myThread: z
      .object({ id, status: z.string(), version: z.number().int(), offers: z.array(offerVendorDTO) })
      .strict()
      .nullable(),
  })
  .strict();
export type PriceRequestVendorDTO = z.infer<typeof priceRequestVendorDTO>;

export const offerCustomerDTO = offerVendorDTO;
export const priceRequestCustomerDTO = z
  .object({
    id,
    number: z.string(),
    status: z.string(),
    qty: z.number().int(),
    targetPrice: halalas,
    recipientsCount: z.number().int(),
    threads: z.array(
      z
        .object({
          id,
          store: z.object({ name: z.string() }).strict(), // D21: store name, never contact details
          status: z.string(),
          version: z.number().int(),
          offers: z.array(offerCustomerDTO),
        })
        .strict(),
    ),
  })
  .strict();
export type PriceRequestCustomerDTO = z.infer<typeof priceRequestCustomerDTO>;
