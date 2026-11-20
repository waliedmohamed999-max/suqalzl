/**
 * Client-safe /admin constants (frontend admin note: value imports of features/admin/schema.ts used
 * to pull lib/permissions -> auth/session -> pg into the browser bundle). This module imports
 * NOTHING: client components import option lists from here. features/admin/schema.ts re-exports
 * the same arrays, so server code may keep importing them from the schema.
 */
export { STAFF_PERMISSIONS, type StaffPermission } from "@/lib/permission-names";

export const ADMIN_SECTIONS = [
  "dashboard",
  "products",
  "categories",
  "orders",
  "customers",
  "coupons",
  "settings",
  "staff",
  "audit",
] as const;
export type AdminSectionName = (typeof ADMIN_SECTIONS)[number];

export const DASHBOARD_PERIODS = ["today", "7d", "30d", "90d"] as const;
export const PRODUCT_STATUSES = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"] as const;
export const SETTING_GROUPS = ["store", "finance", "payouts", "marketing", "negotiation", "security", "other"] as const;
export const COUPON_TYPES = ["PERCENT", "FIXED", "FREE_SHIPPING"] as const;
export const COUPON_APPROVAL_STATUSES = ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"] as const;
