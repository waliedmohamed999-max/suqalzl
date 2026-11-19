import { z } from "zod";
import { halalas, imageDTO, isoDate, locale, paged, uuid } from "@/features/common/schema";
import { vendorCardDTO } from "@/features/catalog/schema";

/**
 * Customer orders, read only (M1-02 / P2-04, /account "طلباتي" + order details + timeline).
 * The customer never sees store finance (commission, vendorNet, payable, fee bearer) nor any
 * staff/vendor identity in the timeline: only the status, the time and a public note.
 */
export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "PARTIALLY_CANCELLED",
  "CANCELLED",
  "PAID_NEEDS_REVIEW",
] as const;
export const orderStatus = z.enum(ORDER_STATUSES);
export const SUB_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "NEW",
  "PREPARING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
] as const;
export const subOrderStatus = z.enum(SUB_ORDER_STATUSES);
export const paymentStatus = z.enum([
  "INITIATED",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "VOIDED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);
export const paymentMethod = z.enum(["MADA", "CARD", "APPLE_PAY", "STC_PAY", "TABBY", "TAMARA"]);

/** frozen at purchase time (OrderItem.productSnapshot) */
export const orderLineDTO = z
  .object({
    id: uuid,
    name: z.string(),
    optionsLabel: z.string(),
    sku: z.string().nullable(),
    image: imageDTO.nullable(),
    /** current product page, null when the product is no longer published */
    productSlug: z.string().nullable(),
    qty: z.number().int().positive(),
    unitPrice: halalas,
    lineTotal: halalas,
  })
  .strict();
export type OrderLineDTO = z.infer<typeof orderLineDTO>;

export const addressSnapshotDTO = z
  .object({
    recipientName: z.string(),
    recipientPhone: z.string(),
    city: z.string(),
    district: z.string(),
    street: z.string(),
    buildingNo: z.string().nullable(),
    postalCode: z.string().nullable(),
    nationalAddressShort: z.string().nullable(),
  })
  .strict();

export const timelineEventDTO = z
  .object({
    status: subOrderStatus,
    at: isoDate,
    note: z.string().nullable(),
  })
  .strict();

export const shipmentDTO = z
  .object({
    carrier: z.string().nullable(),
    trackingNumber: z.string().nullable(),
    status: z.string(),
    shippedAt: isoDate.nullable(),
    deliveredAt: isoDate.nullable(),
  })
  .strict();

export const customerSubOrderDTO = z
  .object({
    id: uuid,
    number: z.string(),
    status: subOrderStatus,
    /** null = Souq AlZal itself (D6); "ينفّذه متجر …" (D21) */
    vendor: vendorCardDTO.nullable(),
    lines: z.array(orderLineDTO),
    subtotal: halalas,
    discount: halalas,
    shippingFee: halalas,
    total: halalas,
    timeline: z.array(timelineEventDTO),
    shipments: z.array(shipmentDTO),
  })
  .strict();

export const customerOrderSummaryDTO = z
  .object({
    id: uuid,
    number: z.string(),
    placedAt: isoDate,
    status: orderStatus,
    paymentStatus,
    grandTotal: halalas,
    itemCount: z.number().int().nonnegative(),
    /** up to 4 thumbnails for the list card */
    thumbnails: z.array(imageDTO),
    subOrderCount: z.number().int().nonnegative(),
  })
  .strict();
export type CustomerOrderSummaryDTO = z.infer<typeof customerOrderSummaryDTO>;

export const customerOrderListDTO = paged(customerOrderSummaryDTO);
export type CustomerOrderListDTO = z.infer<typeof customerOrderListDTO>;

export const customerOrderDetailDTO = z
  .object({
    id: uuid,
    number: z.string(),
    placedAt: isoDate,
    paidAt: isoDate.nullable(),
    status: orderStatus,
    paymentStatus,
    paymentMethod,
    address: addressSnapshotDTO,
    subOrders: z.array(customerSubOrderDTO),
    subtotal: halalas,
    discountTotal: halalas,
    shippingTotal: halalas,
    vatTotal: halalas,
    grandTotal: halalas,
    couponCode: z.string().nullable(),
  })
  .strict();
export type CustomerOrderDetailDTO = z.infer<typeof customerOrderDetailDTO>;

export const customerOrderListInput = z
  .object({
    locale: locale.default("ar"),
    page: z.number().int().min(1).max(1000).default(1),
    perPage: z.number().int().min(1).max(50).default(10),
  })
  .strict();
export const customerOrderDetailInput = z
  .object({
    locale: locale.default("ar"),
    number: z.string().regex(/^SZ-\d{6,}$/),
  })
  .strict();
