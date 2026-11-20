/**
 * Permission NAMES only (SPEC §4): no imports, safe in a browser bundle. lib/permissions.ts
 * re-exports these and adds the server logic (it lazily imports the session/DB layer, so client
 * modules and contracts must import names from HERE, never from lib/permissions).
 */
export const STAFF_PERMISSIONS = [
  "orders.manage",
  "products.review",
  "vendors.manage",
  "payouts.manage",
  "cms.manage",
  "customers.view",
  "reports.view",
  "settings.manage",
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];
