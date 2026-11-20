import { z } from "zod";
import { imageDTO, isoDate, locale, uuid } from "@/features/common/schema";

/**
 * Product reviews by the buyer (P2-04, SPEC §8 "تقييم لمنتج اتسلّم"). `account()` Server Actions in
 * features/reviews/actions.ts:
 *   listReviewableAction({ locale })          -> ActionResult<ReviewableItemDTO[]>
 *       lines of the customer's own sub-orders in DELIVERED / COMPLETED (and returned-then-kept
 *       is not reviewable), with the existing review if any.
 *   createReviewAction(createReviewInput)     -> ActionResult<ReviewableItemDTO>
 *       one review per order line (REVIEW_EXISTS); the line must be the customer's and delivered
 *       (REVIEW_NOT_ALLOWED). Comment is plain text, contact details filtered (lib/contact-filter,
 *       the original is kept for the admin). Status PENDING until moderation (P3-01); the product
 *       rating counts APPROVED reviews only.
 */
export const createReviewInput = z
  .object({
    orderItemId: uuid,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).nullable().default(null),
    locale: locale.default("ar"),
  })
  .strict();

export const myReviewDTO = z
  .object({
    id: uuid,
    rating: z.number().int().min(1).max(5),
    comment: z.string().nullable(),
    status: z.enum(["PENDING", "APPROVED", "HIDDEN"]),
    createdAt: isoDate,
  })
  .strict();

export const reviewableItemDTO = z
  .object({
    orderItemId: uuid,
    orderNumber: z.string(),
    name: z.string(),
    optionsLabel: z.string(),
    image: imageDTO.nullable(),
    productSlug: z.string().nullable(),
    deliveredAt: isoDate.nullable(),
    review: myReviewDTO.nullable(),
  })
  .strict();
export type ReviewableItemDTO = z.infer<typeof reviewableItemDTO>;
