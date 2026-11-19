/**
 * URL option lists shared by the list views (client) and their pages (server). Kept out of the
 * "use client" modules so server pages get the real arrays, not client references.
 */
export const PAGE_SIZES = [25, 50, 100] as const;
export const PRODUCT_SORTS = [
  "updated_desc",
  "created_desc",
  "name_asc",
  "price_asc",
  "price_desc",
  "stock_asc",
] as const;
export const ORDER_VIEWS = [
  "PAID",
  "PROCESSING",
  "PENDING_PAYMENT",
  "COMPLETED",
  "CANCELLED",
  "PAID_NEEDS_REVIEW",
] as const;
export const ORDER_PERIODS = ["7d", "30d", "90d"] as const;
export const ORDER_PAYMENT_FILTER = ["PAID", "INITIATED", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
export const CUSTOMER_SORTS = ["created_desc", "orders_desc", "spent_desc"] as const;
export const AUDIT_PERIODS = ["today", "7d", "30d", "90d"] as const;
/** Entities written by the services so far (audit filter); other values still work from the URL. */
export const AUDIT_ENTITIES = ["Product", "User", "Category", "Order", "SubOrder", "Setting", "Vendor"] as const;
