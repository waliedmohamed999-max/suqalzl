import { z } from "zod";
import { halalas, imageDTO, locale, uuid } from "@/features/common/schema";
import { bnplLineDTO, stockLevel, vendorCardDTO } from "@/features/catalog/schema";
import { appliedCouponDTO } from "@/features/coupons/schema";
import { SAUDI_MOBILE_E164 } from "@/lib/phone";

/**
 * Cart + checkout address/shipping step (M1-02 / P2-02, SPEC §7.1 /cart, /checkout).
 * - Guests get an httpOnly cookie with a random token; the database stores its SHA-256 only.
 * - After login the guest cart is merged into the user's cart (quantities added, capped).
 * - Prices are re-read on every request (the cart never stores a price, D33-1 is for PriceLock).
 * - Payment (P2-03) is out of M1: the address step returns a quote, nothing is charged/reserved.
 */
export const cartLineDTO = z
  .object({
    id: uuid,
    kind: z.enum(["VARIANT", "BUNDLE"]),
    variantId: uuid.nullable(),
    bundleId: uuid.nullable(),
    slug: z.string(),
    name: z.string(),
    /** option values in option order ("أسود / 56"); "" for bundles and products without options */
    optionsLabel: z.string(),
    image: imageDTO.nullable(),
    unitPrice: halalas,
    compareAtPrice: halalas.nullable(),
    qty: z.number().int().positive(),
    lineTotal: halalas,
    stockLevel,
    /** current purchasable maximum for this line */
    maxQty: z.number().int().nonnegative(),
    /** false = product unpublished/archived, variant disabled or out of stock: excluded from totals */
    available: z.boolean(),
    /** qty > maxQty right now (the UI offers to reduce) */
    qtyExceedsStock: z.boolean(),
    /** null = Souq AlZal (D6) */
    vendor: vendorCardDTO.nullable(),
  })
  .strict();
export type CartLineDTO = z.infer<typeof cartLineDTO>;

export const cartDTO = z
  .object({
    lines: z.array(cartLineDTO),
    /** sum of qty over available lines (header badge) */
    itemCount: z.number().int().nonnegative(),
    /** available lines only, VAT inclusive (D8) */
    subtotal: halalas,
    /** VAT contained in subtotal: round(subtotal × 15 / 115) — informative ("شامل الضريبة") */
    vatIncluded: halalas,
    /** some lines are unavailable or above stock: checkout is blocked until fixed */
    hasIssues: z.boolean(),
    /** D3: one cart, one payment; the order splits per store internally */
    storeCount: z.number().int().nonnegative(),
    /** applied coupon (P2-02), re-validated on every read; null = none */
    coupon: appliedCouponDTO.nullable(),
    /** items discount from the coupon (0 when none / invalid). Shipping is added at checkout */
    discountTotal: halalas,
    /** subtotal − discountTotal (before shipping) */
    total: halalas,
    /** D32 installments line for `total`, every visitor; null = no BNPL provider configured */
    bnpl: bnplLineDTO.nullable(),
  })
  .strict();
export type CartDTO = z.infer<typeof cartDTO>;

export const MAX_CART_LINES = 50;

export const addToCartInput = z
  .object({
    variantId: uuid.optional(),
    bundleId: uuid.optional(),
    qty: z.number().int().min(1).max(10).default(1),
    locale: locale.default("ar"),
  })
  .strict()
  .refine((v) => (v.variantId ? 1 : 0) + (v.bundleId ? 1 : 0) === 1, { message: "variantId xor bundleId" });
export const updateCartLineInput = z
  .object({ lineId: uuid, qty: z.number().int().min(0).max(10), locale: locale.default("ar") })
  .strict();
export const removeCartLineInput = z.object({ lineId: uuid, locale: locale.default("ar") }).strict();

// ------------------------------------------------------------------ checkout: address + shipping
/**
 * Light actions for the store front (features/cart/actions.ts):
 *   listCitiesAction(locale)     -> ActionResult<CityDTO[]>     public (address form city select)
 *   listAddressesAction(locale)  -> ActionResult<AddressDTO[]>  account(): /account/addresses
 * plus saveAddressAction / deleteAddressAction (M1). The final checkout totals (coupon, payment
 * methods) are in features/checkout/schema.ts (checkoutSummaryDTO); shippingQuoteDTO stays for
 * the address step.
 */
export const cityDTO = z.object({ id: uuid, slug: z.string(), name: z.string() }).strict();
export type CityDTO = z.infer<typeof cityDTO>;

export const addressDTO = z
  .object({
    id: uuid,
    label: z.string().nullable(),
    recipientName: z.string(),
    recipientPhone: z.string(),
    city: cityDTO,
    district: z.string(),
    street: z.string(),
    buildingNo: z.string().nullable(),
    postalCode: z.string().nullable(),
    nationalAddressShort: z.string().nullable(),
    isDefault: z.boolean(),
  })
  .strict();
export type AddressDTO = z.infer<typeof addressDTO>;

const text = (max: number) => z.string().trim().min(1).max(max);
export const addressInput = z
  .object({
    label: z.string().trim().max(40).nullable().default(null),
    recipientName: text(80),
    /** +9665XXXXXXXX (D23); the UI may send 05XXXXXXXX: normalised server-side */
    recipientPhone: z.string().trim().min(9).max(16),
    cityId: uuid,
    district: text(80),
    street: text(120),
    buildingNo: z.string().trim().max(10).nullable().default(null),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/)
      .nullable()
      .default(null),
    /** Saudi short national address, e.g. RRRD2929 */
    nationalAddressShort: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}\d{4}$/)
      .nullable()
      .default(null),
    isDefault: z.boolean().default(false),
  })
  .strict();
export type AddressInput = z.input<typeof addressInput>;
export const updateAddressInput = addressInput.extend({ id: uuid }).strict();
export const MAX_ADDRESSES = 10;
export { SAUDI_MOBILE_E164 };

export const shippingQuoteInput = z.object({ addressId: uuid, locale: locale.default("ar") }).strict();

/**
 * One shipment per store (D3, shipping policy §2). Rates come from ShippingZone (admin, D17/O4:
 * the owner configures shipping later). No zone for the city -> SHIPPING_UNAVAILABLE.
 */
export const shippingQuoteDTO = z
  .object({
    addressId: uuid,
    shipments: z.array(
      z
        .object({
          vendor: vendorCardDTO.nullable(),
          itemsTotal: halalas,
          weightGrams: z.number().int().nonnegative(),
          fee: halalas,
          freeShipping: z.boolean(),
          etaDays: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    subtotal: halalas,
    shippingTotal: halalas,
    /** subtotal + shippingTotal, WITHOUT the coupon: the final total is checkoutSummaryDTO */
    grandTotal: halalas,
    vatIncluded: halalas,
    /** true when at least one payment provider is configured in this environment (P2-03) */
    paymentAvailable: z.boolean(),
  })
  .strict();
export type ShippingQuoteDTO = z.infer<typeof shippingQuoteDTO>;

export const checkoutAddressStepDTO = z
  .object({
    cart: cartDTO,
    addresses: z.array(addressDTO),
    cities: z.array(cityDTO),
    /** default address id (or the first one) the step pre-selects */
    selectedAddressId: uuid.nullable(),
  })
  .strict();
export type CheckoutAddressStepDTO = z.infer<typeof checkoutAddressStepDTO>;
