import type { ActionResult, ErrorCode } from "@/features/common/schema";
import type { CartDTO } from "@/features/cart/schema";

/**
 * Server Action signatures the store islands receive as props (the page passes the backend action
 * from src/features/cart/actions.ts). Keeping them as props keeps the islands free of server imports
 * and lets the component tests pass fakes.
 */
export type AddToCartAction = (input: {
  variantId?: string;
  bundleId?: string;
  qty: number;
  locale: "ar" | "en";
}) => Promise<ActionResult<CartDTO>>;

export type UpdateLineAction = (input: {
  lineId: string;
  qty: number;
  locale: "ar" | "en";
}) => Promise<ActionResult<CartDTO>>;
export type RemoveLineAction = (input: { lineId: string; locale: "ar" | "en" }) => Promise<ActionResult<CartDTO>>;

export type { ActionResult, ErrorCode };
