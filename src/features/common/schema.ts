import { z } from "zod";

/**
 * Shared building blocks for the M1 contracts (D30: backend publishes the Zod schema first, the UI
 * builds on it; src/dev/zod-sample.ts generates test/catalogue samples from these schemas).
 *
 * Conventions for every DTO in src/features/<feature>/schema.ts
 * - OUTPUT schemas are `.strict()` and every response is parsed before it leaves the server: an
 *   extra key (a careless `include`) is an error, not a leak (D36-6, backend.md 5.6-2).
 * - INPUT schemas are `.strict()`: identity (userId / vendorId / role) is NEVER accepted from the
 *   client, it comes from the server session (CLAUDE.md rule 8).
 * - Money is an integer number of HALALAS (D7, CLAUDE.md rule 5). The UI formats with formatSAR().
 * - Dates are ISO-8601 strings in UTC; the UI displays Asia/Riyadh.
 * - Public (store) DTOs are already localised (`name`, `description`) for the requested locale;
 *   admin DTOs carry both languages (`nameAr` / `nameEn`) because the admin edits both.
 * - Errors: Server Actions return `ActionResult` (below); Route Handlers return
 *   `{ error: { code } }` (src/lib/http.ts). The UI maps `code` -> messages/*.json "errors.*".
 */
export const uuid = z.uuid();
export const halalas = z.number().int().nonnegative();
export const positiveHalalas = z.number().int().positive();
export const isoDate = z.iso.datetime({ offset: true });
export const locale = z.enum(["ar", "en"]);
export type Locale = z.infer<typeof locale>;
/** URL slug: lowercase latin, digits and dashes (Arabic names are transliterated by the admin). */
export const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const imageDTO = z
  .object({
    url: z.string(),
    alt: z.string(),
  })
  .strict();
export type ImageDTO = z.infer<typeof imageDTO>;

/** 1-based pages. perPage is capped server-side. */
export const pageInput = z
  .object({
    page: z.number().int().min(1).max(10_000).default(1),
    perPage: z.number().int().min(1).max(100).default(24),
  })
  .strict();

export function paged<T extends z.ZodType>(item: T) {
  return z
    .object({
      items: z.array(item),
      page: z.number().int().min(1),
      perPage: z.number().int().min(1),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    })
    .strict();
}
export interface Paged<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/**
 * Stable error codes shared by actions and route handlers. The UI maps them to
 * messages/*.json "errors.<CODE>".
 */
export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "INTERNAL",
  // catalog / admin products
  "SLUG_TAKEN",
  "SKU_TAKEN",
  "INVALID_IMAGE",
  "UPLOAD_REJECTED_TYPE",
  "UPLOAD_REJECTED_SIZE",
  "STORAGE_UNAVAILABLE",
  "VENDOR_PRODUCT_READ_ONLY",
  "CATEGORY_NOT_FOUND",
  // cart / checkout
  "OUT_OF_STOCK",
  "QTY_LIMIT",
  "NOT_AVAILABLE",
  "CART_LIMIT",
  "CITY_NOT_FOUND",
  "SHIPPING_UNAVAILABLE",
  "ADDRESS_LIMIT",
] as const;
export const errorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCode>;

export const actionError = z
  .object({
    ok: z.literal(false),
    code: errorCode,
    /** field paths for VALIDATION (react-hook-form setError), never values */
    issues: z.array(z.object({ path: z.string(), code: z.string() }).strict()).optional(),
  })
  .strict();
export type ActionError = z.infer<typeof actionError>;
export type ActionResult<T> = { ok: true; data: T } | ActionError;
