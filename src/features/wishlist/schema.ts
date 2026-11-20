import { z } from "zod";
import { isoDate, locale, uuid } from "@/features/common/schema";
import { productCardDTO } from "@/features/catalog/schema";

/**
 * Wishlist / المفضلة (P2-02 + P2-04). Signed-in customers only (guests: the heart opens login).
 * Server Actions in features/wishlist/actions.ts (all `account()`; userId from the session):
 *   toggleWishlistAction(toggleWishlistInput)   -> ActionResult<WishlistToggleDTO>
 *   listWishlistAction(wishlistListInput)       -> ActionResult<WishlistDTO>      (/account/wishlist)
 *   wishlistIdsAction()                         -> ActionResult<WishlistIdsDTO>   (heart state on cards)
 * Only PUBLISHED products are listed; an item whose product was unpublished stays in the table
 * but is hidden from the list (it comes back if the product is republished). Max 200 items.
 */
export const MAX_WISHLIST_ITEMS = 200;

export const toggleWishlistInput = z
  .object({
    productId: uuid,
    /** explicit target state (idempotent double-click); omitted = flip */
    on: z.boolean().optional(),
  })
  .strict();
export const wishlistToggleDTO = z
  .object({ productId: uuid, inWishlist: z.boolean(), count: z.number().int().nonnegative() })
  .strict();
export type WishlistToggleDTO = z.infer<typeof wishlistToggleDTO>;

export const wishlistListInput = z
  .object({
    locale: locale.default("ar"),
    page: z.number().int().min(1).max(100).default(1),
    perPage: z.number().int().min(1).max(60).default(24),
  })
  .strict();
export const wishlistItemDTO = z.object({ product: productCardDTO, addedAt: isoDate }).strict();
export const wishlistDTO = z
  .object({
    items: z.array(wishlistItemDTO),
    page: z.number().int().min(1),
    perPage: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .strict();
export type WishlistDTO = z.infer<typeof wishlistDTO>;

export const wishlistIdsDTO = z.object({ productIds: z.array(uuid) }).strict();
export type WishlistIdsDTO = z.infer<typeof wishlistIdsDTO>;
