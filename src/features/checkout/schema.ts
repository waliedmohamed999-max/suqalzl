import { z } from "zod";
import { halalas, isoDate, locale, uuid } from "@/features/common/schema";
import { bnplLineDTO, vendorCardDTO } from "@/features/catalog/schema";
import { cartDTO } from "@/features/cart/schema";
import { appliedCouponDTO } from "@/features/coupons/schema";
import { orderStatus, paymentMethod, paymentStatus } from "@/features/orders/schema";

/**
 * Checkout + payment (P2-02 / P2-03, SPEC 6.2, backend.md §3–§4). Signed-in customers only.
 *
 * Flow (Server Actions in features/checkout/actions.ts, all `account()`):
 *   1. getCheckoutSummaryAction(checkoutSummaryInput)  -> ActionResult<CheckoutSummaryDTO>
 *      final totals for the chosen address: per-store shipments, coupon, VAT, payment methods.
 *   2. placeOrderAction(placeOrderInput)               -> ActionResult<PlacedOrderDTO>
 *      ONE transaction: Order (PENDING_PAYMENT) + SubOrders per store + OrderItems +
 *      StockReservation (checkoutReservationMinutes = 30). `expectedTotal` must equal the server
 *      total or PRICE_CHANGED (show the new summary). Idempotent on `idempotencyKey` (a UUID the
 *      page generates once): a double click returns the same order.
 *   3. startPaymentAction(startPaymentInput)           -> ActionResult<StartPaymentDTO>
 *      creates our Payment (its id = Moyasar given_id) and returns what the browser needs:
 *      MOYASAR_FORM (mada / card / Apple Pay / STC Pay through the Moyasar form) or REDIRECT
 *      (Tabby / Tamara hosted checkout). Can be called again for a FAILED attempt while the
 *      reservation is alive (retryUntil).
 *   4. The gateway sends the customer back to /checkout/return?order=SZ-…(&id=…):
 *      confirmReturnAction(confirmReturnInput)        -> ActionResult<CheckoutResultDTO>
 *      re-fetches the payment from the provider on the server (never trusts the redirect).
 *   5. The result page polls getCheckoutResultAction({ orderNumber }) every 3 s while
 *      state = PENDING_VERIFICATION (the webhook is the source of truth, SPEC 6.2-3).
 *   cancelPendingOrderAction({ orderNumber })          -> ActionResult<null>
 *      customer abandons an unpaid order: releases the stock now instead of after 30 min.
 *
 * Errors: CART_EMPTY, CART_HAS_ISSUES (fix the cart first), SHIPPING_UNAVAILABLE, PRICE_CHANGED,
 *   COUPON_* (the coupon stopped applying), OUT_OF_STOCK (someone else reserved it),
 *   BUYER_VAT_INVALID, PAYMENT_METHOD_UNAVAILABLE (method not offered / BNPL not eligible),
 *   PAYMENT_UNAVAILABLE (provider not configured in this environment), PAYMENT_PROVIDER_ERROR
 *   (provider down: retry), ORDER_NOT_PAYABLE (expired, cancelled or already paid).
 */

export const checkoutSummaryInput = z
  .object({
    addressId: uuid,
    locale: locale.default("ar"),
  })
  .strict();

export const PAYMENT_METHODS = ["MADA", "CARD", "APPLE_PAY", "STC_PAY", "TABBY", "TAMARA"] as const;

export const paymentMethodOptionDTO = z
  .object({
    method: paymentMethod,
    available: z.boolean(),
    /**
     * why it is not offered: NOT_CONFIGURED (no keys in this environment), NOT_ELIGIBLE (BNPL
     * provider said no / outside its limits). The UI hides BNPL buttons unless available (6.2-13).
     */
    unavailableReason: z.enum(["NOT_CONFIGURED", "NOT_ELIGIBLE"]).nullable(),
  })
  .strict();
export type PaymentMethodOptionDTO = z.infer<typeof paymentMethodOptionDTO>;

export const checkoutShipmentDTO = z
  .object({
    /** null = Souq AlZal (D6) */
    vendor: vendorCardDTO.nullable(),
    itemsTotal: halalas,
    /** coupon share on this shipment's items (public + store coupon) */
    discount: halalas,
    /** before FREE_SHIPPING */
    shippingFee: halalas,
    shippingDiscount: halalas,
    freeShipping: z.boolean(),
    etaDays: z.number().int().nonnegative(),
  })
  .strict();

export const checkoutSummaryDTO = z
  .object({
    addressId: uuid,
    cart: cartDTO,
    shipments: z.array(checkoutShipmentDTO),
    coupon: appliedCouponDTO.nullable(),
    subtotal: halalas,
    discountTotal: halalas,
    shippingTotal: halalas,
    /** grand total VAT inclusive = subtotal − discountTotal + shippingTotal */
    grandTotal: halalas,
    vatIncluded: halalas,
    paymentMethods: z.array(paymentMethodOptionDTO),
    /** D32 line under the total (marketing; the BNPL BUTTON follows paymentMethods) */
    bnpl: bnplLineDTO.nullable(),
    /** minutes the stock stays reserved after placing the order */
    reservationMinutes: z.number().int().positive(),
  })
  .strict();
export type CheckoutSummaryDTO = z.infer<typeof checkoutSummaryDTO>;

/** Saudi VAT number: 15 digits, starts and ends with 3 (B2B standard invoice, D11). */
export const buyerVatNumber = z
  .string()
  .trim()
  .regex(/^3\d{13}3$/);

export const placeOrderInput = z
  .object({
    addressId: uuid,
    paymentMethod,
    /** the grandTotal the customer saw (halalas): mismatch -> PRICE_CHANGED */
    expectedTotal: halalas,
    /** UUID generated once per checkout page: double submit returns the same order */
    idempotencyKey: uuid,
    /** both or neither: B2B tax invoice (STANDARD) */
    buyerVatNumber: buyerVatNumber.nullable().default(null),
    buyerLegalName: z.string().trim().min(2).max(120).nullable().default(null),
    locale: locale.default("ar"),
  })
  .strict()
  .refine((v) => (v.buyerVatNumber === null) === (v.buyerLegalName === null), { path: ["buyerLegalName"] });
export type PlaceOrderInput = z.input<typeof placeOrderInput>;

export const placedOrderDTO = z
  .object({
    orderId: uuid,
    orderNumber: z.string(),
    grandTotal: halalas,
    paymentMethod,
    /** stock reserved until then; unpaid after it -> cancelled by the cron (6.2-5) */
    reservedUntil: isoDate,
  })
  .strict();
export type PlacedOrderDTO = z.infer<typeof placedOrderDTO>;

export const orderNumberInput = z.object({ orderNumber: z.string().regex(/^SZ-\d{6,}$/) }).strict();

export const startPaymentInput = z
  .object({
    orderNumber: z.string().regex(/^SZ-\d{6,}$/),
    /** may differ from the method chosen at placeOrder (switch after a failure) */
    paymentMethod,
    locale: locale.default("ar"),
  })
  .strict();

/**
 * MOYASAR_FORM: mount the Moyasar Payment Form (moyasar.js from cdn.moyasar.com, CSP allows it)
 * with exactly these values. `givenId` is our Payment.id (idempotency, 6.2-10). `methods` is the
 * subset of creditcard / applepay / stcpay for the chosen method. No card data touches our server.
 * REDIRECT: window.location.assign(redirectUrl) (Tabby / Tamara hosted checkout).
 */
export const startPaymentDTO = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("MOYASAR_FORM"),
      paymentId: uuid,
      form: z
        .object({
          publishableApiKey: z.string(),
          amount: halalas,
          currency: z.literal("SAR"),
          description: z.string(),
          callbackUrl: z.string(),
          givenId: uuid,
          methods: z.array(z.enum(["creditcard", "applepay", "stcpay"])).min(1),
          supportedNetworks: z.array(z.enum(["mada", "visa", "mastercard", "amex"])),
          metadata: z.object({ orderId: uuid, orderNumber: z.string(), env: z.string() }).strict(),
          applePay: z
            .object({ country: z.literal("SA"), label: z.string(), validateMerchantUrl: z.string() })
            .strict()
            .nullable(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("REDIRECT"),
      paymentId: uuid,
      provider: z.enum(["TABBY", "TAMARA"]),
      redirectUrl: z.string(),
    })
    .strict(),
]);
export type StartPaymentDTO = z.infer<typeof startPaymentDTO>;

export const confirmReturnInput = z
  .object({
    orderNumber: z.string().regex(/^SZ-\d{6,}$/),
    /** Moyasar appends ?id=<payment id>; Tabby ?payment_id=; Tamara ?orderId=. Optional hint only */
    gatewayRef: z.string().trim().min(1).max(100).optional(),
    locale: locale.default("ar"),
  })
  .strict();

/**
 * Result page states (success page):
 *   PAID                  payment verified with the provider (webhook or server re-fetch)
 *   PENDING_VERIFICATION  back from the gateway but not confirmed yet: poll; never show "paid"
 *   FAILED                declined / cancelled / expired: canRetry while the reservation lives
 * `paymentStatus` and `orderStatus` are informative; drive the page by `state`.
 */
export const CHECKOUT_RESULT_STATES = ["PAID", "PENDING_VERIFICATION", "FAILED"] as const;
export const checkoutResultDTO = z
  .object({
    state: z.enum(CHECKOUT_RESULT_STATES),
    orderNumber: z.string(),
    orderStatus,
    paymentStatus,
    paymentMethod,
    grandTotal: halalas,
    placedAt: isoDate,
    paidAt: isoDate.nullable(),
    /** FAILED: stable reason code for messages (DECLINED, CANCELLED, EXPIRED, AMOUNT_MISMATCH) */
    failureReason: z.enum(["DECLINED", "CANCELLED", "EXPIRED", "AMOUNT_MISMATCH"]).nullable(),
    /** FAILED and the stock is still reserved: offer startPayment again (any method) */
    canRetry: z.boolean(),
    retryUntil: isoDate.nullable(),
    /** D3: the order splits per store; "طلبك وصل لـ N متاجر" */
    subOrders: z
      .array(
        z
          .object({ number: z.string(), vendor: vendorCardDTO.nullable(), itemCount: z.number().int().positive() })
          .strict(),
      )
      .min(1),
    /** suggested poll interval while PENDING_VERIFICATION; null otherwise */
    pollAfterMs: z.number().int().positive().nullable(),
  })
  .strict();
export type CheckoutResultDTO = z.infer<typeof checkoutResultDTO>;
