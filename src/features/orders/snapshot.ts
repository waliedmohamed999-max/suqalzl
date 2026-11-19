import { z } from "zod";

/**
 * Shape of OrderItem.productSnapshot / Order.addressSnapshot (frozen at purchase time, SPEC §5).
 * Written by checkout (P2-03) and by the demo seed; read by the order pages. Parsed leniently:
 * an old/partial snapshot never breaks an order page.
 */
export const orderItemSnapshot = z.object({
  productId: z.string().nullable().catch(null),
  slug: z.string().nullable().catch(null),
  nameAr: z.string().catch(""),
  nameEn: z.string().catch(""),
  sku: z.string().nullable().catch(null),
  imagePath: z.string().nullable().catch(null),
  optionsAr: z.string().catch(""),
  optionsEn: z.string().catch(""),
});
export type OrderItemSnapshot = z.infer<typeof orderItemSnapshot>;

export const addressSnapshot = z.object({
  recipientName: z.string().catch(""),
  recipientPhone: z.string().catch(""),
  cityAr: z.string().catch(""),
  cityEn: z.string().catch(""),
  district: z.string().catch(""),
  street: z.string().catch(""),
  buildingNo: z.string().nullable().catch(null),
  postalCode: z.string().nullable().catch(null),
  nationalAddressShort: z.string().nullable().catch(null),
});
export type AddressSnapshot = z.infer<typeof addressSnapshot>;

export const parseItemSnapshot = (v: unknown): OrderItemSnapshot => orderItemSnapshot.parse(v ?? {});
export const parseAddressSnapshot = (v: unknown): AddressSnapshot => addressSnapshot.parse(v ?? {});
