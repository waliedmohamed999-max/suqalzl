import { z } from "zod";
import { halalas, isoDate, locale, uuid } from "@/features/common/schema";

/**
 * Return request / طلب الاسترجاع (P2-04, SPEC 6.3 DELIVERED → RETURN_REQUESTED, returns policy draft).
 * Customer Server Actions in features/returns/actions.ts (`account()`):
 *   requestReturnAction(requestReturnInput)   -> ActionResult<ReturnDTO>
 *   listMyReturnsAction({ locale })           -> ActionResult<ReturnDTO[]>
 * Rules
 * - Only the customer's own sub-order, status DELIVERED, within returnWindowDays (Setting, default
 *   7 from deliveredAt). Else RETURN_NOT_ALLOWED / RETURN_WINDOW_CLOSED.
 * - One open request per sub-order (RETURN_EXISTS). qty per line <= bought qty minus quantities in
 *   earlier requests (RETURN_QTY).
 * - The sub-order moves to RETURN_REQUESTED through orders transition() (OrderStatusHistory). The
 *   decision, the refund (recompute-and-diff, finance TC9/TC10) and the credit note are admin
 *   work (P3-01). `refundAmount` here is an ESTIMATE of the items' paid value, shown as such.
 * - Photos: storage keys uploaded first through the private upload route (P3); optional now.
 */
export const RETURN_REASONS = ["DAMAGED", "WRONG_ITEM", "NOT_AS_DESCRIBED", "CHANGED_MIND", "OTHER"] as const;
export const returnReason = z.enum(RETURN_REASONS);
export const returnStatus = z.enum(["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]);

export const requestReturnInput = z
  .object({
    subOrderNumber: z.string().regex(/^SZ-\d{6,}-\d{1,3}$/),
    items: z
      .array(z.object({ orderItemId: uuid, qty: z.number().int().min(1).max(10) }).strict())
      .min(1)
      .max(50),
    reason: returnReason,
    note: z.string().trim().max(1000).nullable().default(null),
    locale: locale.default("ar"),
  })
  .strict()
  .refine((v) => v.reason !== "OTHER" || (v.note !== null && v.note.length >= 5), { path: ["note"] });

export const returnDTO = z
  .object({
    id: uuid,
    subOrderNumber: z.string(),
    status: returnStatus,
    reason: returnReason,
    note: z.string().nullable(),
    items: z.array(z.object({ orderItemId: uuid, name: z.string(), qty: z.number().int().positive() }).strict()),
    /** estimate (items' paid share); the final amount is decided by the admin */
    estimatedRefund: halalas,
    refundAmount: halalas,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();
export type ReturnDTO = z.infer<typeof returnDTO>;
