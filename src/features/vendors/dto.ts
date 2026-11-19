/**
 * Public store DTO (D36-6, SPEC §4 "أعمدة vendors الحساسة", D21). The ONLY shape in which a store
 * leaves the server on public pages (store page, product page, souq cards, offer comparison):
 * name, slug, logo, cover, description, city, rating and badges. Never legal/bank/address data,
 * owner id, commission or status internals. `.strict()` turns any extra key into an error, so a
 * careless `include: { vendor: true }` fails loudly instead of leaking (leak test: tests/db).
 *
 * Usage: `tx.vendor.findMany({ where, select: PUBLIC_VENDOR_SELECT })` then `toPublicVendor(row)`.
 */
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

export const publicVendorDTO = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    storeNameAr: z.string(),
    storeNameEn: z.string(),
    logoPath: z.string().nullable(),
    coverPath: z.string().nullable(),
    descriptionAr: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    cityId: z.uuid().nullable(),
    ratingAvg: z.string(), // Decimal(3,2) as text, e.g. "4.80"
    ratingCount: z.number().int().nonnegative(),
    avgResponseMinutes: z.number().int().nullable(),
    acceptanceRateBps: z.number().int().nullable(),
  })
  .strict();
export type PublicVendorDTO = z.infer<typeof publicVendorDTO>;

export const PUBLIC_VENDOR_SELECT = {
  id: true,
  slug: true,
  storeNameAr: true,
  storeNameEn: true,
  logoPath: true,
  coverPath: true,
  descriptionAr: true,
  descriptionEn: true,
  cityId: true,
  ratingAvg: true,
  ratingCount: true,
  avgResponseMinutes: true,
  acceptanceRateBps: true,
} as const satisfies Prisma.VendorSelect;

export function toPublicVendor(row: Prisma.VendorGetPayload<{ select: typeof PUBLIC_VENDOR_SELECT }>): PublicVendorDTO {
  return publicVendorDTO.parse({ ...row, ratingAvg: row.ratingAvg.toFixed(2) });
}
