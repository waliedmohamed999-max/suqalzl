/**
 * Roles and permissions (SPEC §4). Pure functions here; the session lookup lives in lib/auth.
 *
 * Rules (SPEC §4, CLAUDE.md rule 8):
 * - Every Server Action and Route Handler starts with requirePermission(...) / requireArea(...).
 * - vendorId ALWAYS comes from the server session (Principal.vendorId), never from the client.
 * - authorize() returns the RLS context to use with withCtx(): admin / vendor / customer.
 */
import type { Ctx } from "./db";

import { STAFF_PERMISSIONS, type StaffPermission } from "./permission-names";
export { STAFF_PERMISSIONS, type StaffPermission };

export const VENDOR_PERMISSIONS = ["products.manage", "orders.fulfill", "finance.view", "reviews.reply"] as const;
export type VendorPermission = (typeof VENDOR_PERMISSIONS)[number];

/** Owner-only vendor actions (team, bank details, settings) are not delegable to VENDOR_STAFF. */
export const VENDOR_OWNER_ONLY = ["vendor.team.manage", "vendor.bank.manage", "vendor.profile.manage"] as const;
export type VendorOwnerPermission = (typeof VENDOR_OWNER_ONLY)[number];

/**
 * Vendor-area capabilities. Each one needs (a) a role/permission (CAPABILITY_REQUIRES) AND (b) to be
 * allowed for the store's CURRENT status (VENDOR_STATUS_ALLOWLIST, D36-3 / QA-B8, SPEC §6.5).
 * Every /vendor route asks for exactly one capability: the status rules are inherited for free.
 */
export const VENDOR_CAPABILITIES = [
  ...VENDOR_PERMISSIONS, // products.manage (products, prices, stock), orders.fulfill, finance.view, reviews.reply
  ...VENDOR_OWNER_ONLY, // vendor.team.manage (invite/edit), vendor.bank.manage (IBAN), vendor.profile.manage
  "vendor.read", // dashboard, products, reviews, team, notifications — read only
  "vendor.application.manage", // PENDING/REJECTED: own application, reject reason, edit, resubmit
  "deals.manage", // /vendor/deals
  "negotiation.respond", // offers, counters, declines on price requests
  "finance.invoice.upload", // D11 purchase invoices
  "finance.payout.request", // "طلب سحب"
  "vendor.team.remove", // remove a member (allowed while suspended)
] as const;
export type VendorCapability = (typeof VENDOR_CAPABILITIES)[number];

/** null = any member; "owner" = VENDOR_OWNER only (G7); otherwise the delegable permission. */
const CAPABILITY_REQUIRES: Record<VendorCapability, VendorPermission | "owner" | null> = {
  "products.manage": "products.manage",
  "orders.fulfill": "orders.fulfill",
  "finance.view": "finance.view",
  "reviews.reply": "reviews.reply",
  "vendor.team.manage": "owner",
  "vendor.bank.manage": "owner",
  "vendor.profile.manage": "owner",
  "vendor.read": null,
  "vendor.application.manage": "owner",
  "deals.manage": "products.manage",
  "negotiation.respond": "products.manage",
  "finance.invoice.upload": "finance.view",
  "finance.payout.request": "owner",
  "vendor.team.remove": "owner",
};

export type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

/**
 * D36-3 (SPEC §6.5): what a store may do in each status. Single source; read from the database on
 * every request (Principal.vendorStatus comes from resolveSession).
 * - SUSPENDED keeps fulfilment of EXISTING sub-orders and finance; no products/prices/stock, deals,
 *   negotiation, review replies, invitations, profile or IBAN edits. Payout freeze: O16 (owner).
 */
export const VENDOR_STATUS_ALLOWLIST: Record<VendorStatus, ReadonlySet<VendorCapability>> = {
  PENDING: new Set<VendorCapability>(["vendor.application.manage"]),
  REJECTED: new Set<VendorCapability>(["vendor.application.manage"]),
  SUSPENDED: new Set<VendorCapability>([
    "vendor.read",
    "orders.fulfill",
    "finance.view",
    "finance.invoice.upload",
    "finance.payout.request",
    "vendor.team.remove",
  ]),
  APPROVED: new Set<VendorCapability>(VENDOR_CAPABILITIES.filter((c) => c !== "vendor.application.manage")),
};

export type Permission =
  { area: "admin"; perm: StaffPermission | "super" } | { area: "vendor"; perm: VendorCapability } | { area: "account" };

export type Principal =
  | { kind: "customer"; userId: string; role: "CUSTOMER" | "SUPER_ADMIN" | "STAFF" | "VENDOR_OWNER" | "VENDOR_STAFF" }
  | { kind: "staff"; userId: string; role: "SUPER_ADMIN" | "STAFF"; permissions: readonly string[] }
  | {
      kind: "vendor";
      userId: string;
      vendorId: string;
      role: "VENDOR_OWNER" | "VENDOR_STAFF";
      permissions: readonly string[];
      /** read from the database on every request (D36-3) */
      vendorStatus: VendorStatus;
    };

export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";
  readonly status = 401;
  constructor() {
    super("UNAUTHORIZED");
  }
}

export class PermissionDeniedError extends Error {
  readonly code = "FORBIDDEN";
  readonly status = 403;
  constructor() {
    super("FORBIDDEN");
  }
}

export function isStaffPermission(p: string): p is StaffPermission {
  return (STAFF_PERMISSIONS as readonly string[]).includes(p);
}
export function isVendorPermission(p: string): p is VendorPermission {
  return (VENDOR_PERMISSIONS as readonly string[]).includes(p);
}

/** Pure check. */
export function can(principal: Principal | null, need: Permission): boolean {
  if (!principal) return false;
  switch (need.area) {
    case "account":
      // any logged-in person has an account area (staff/vendors can also shop)
      return true;
    case "admin":
      if (principal.kind !== "staff") return false;
      if (principal.role === "SUPER_ADMIN") return true;
      if (need.perm === "super") return false;
      return principal.permissions.includes(need.perm);
    case "vendor": {
      if (principal.kind !== "vendor") return false;
      // (b) store status first: no role can do what the status forbids (D36-3)
      if (!VENDOR_STATUS_ALLOWLIST[principal.vendorStatus]?.has(need.perm)) return false;
      const req = CAPABILITY_REQUIRES[need.perm];
      if (req === undefined) return false;
      if (principal.role === "VENDOR_OWNER") return true;
      if (req === "owner") return false;
      return req === null || principal.permissions.includes(req);
    }
  }
}

/** RLS context for a principal acting in an area. */
export function ctxFor(principal: Principal): Ctx {
  switch (principal.kind) {
    case "staff":
      return { kind: "admin", userId: principal.userId };
    case "vendor":
      return { kind: "vendor", userId: principal.userId, vendorId: principal.vendorId };
    case "customer":
      return { kind: "customer", userId: principal.userId };
  }
}

/**
 * Throwing guard: 401 without a session, 403 without the permission.
 * For "account", staff/vendor principals act as CUSTOMER of their own account.
 */
export function authorize(principal: Principal | null, need: Permission): { principal: Principal; ctx: Ctx } {
  if (!principal) throw new UnauthorizedError();
  if (!can(principal, need)) throw new PermissionDeniedError();
  const ctx: Ctx = need.area === "account" ? { kind: "customer", userId: principal.userId } : ctxFor(principal);
  return { principal, ctx };
}

/** Shorthands for call sites: requirePermission(admin("orders.manage")). */
export const admin = (perm: StaffPermission | "super"): Permission => ({ area: "admin", perm });
export const vendor = (perm: VendorCapability): Permission => ({ area: "vendor", perm });
export const account = (): Permission => ({ area: "account" });

/** Validate a permissions array before saving it (staff editor / vendor team editor). */
export function sanitizeStaffPermissions(input: readonly string[]): StaffPermission[] {
  return [...new Set(input.filter(isStaffPermission))];
}
export function sanitizeVendorPermissions(input: readonly string[]): VendorPermission[] {
  return [...new Set(input.filter(isVendorPermission))];
}

/**
 * Server-only: the guard every Server Action / Route Handler starts with (SPEC §4).
 *   const { principal, ctx } = await requirePermission(vendor("products.manage"));
 *   return withCtx(ctx, (tx) => ...)        // vendorId comes from principal, never from input
 * Pass the Request in Route Handlers (Bearer tokens for the mobile app); Server Actions read the cookie.
 */
export async function requirePermission(need: Permission, req?: Request): Promise<{ principal: Principal; ctx: Ctx }> {
  const { getPrincipal, getPrincipalFromRequest } = await import("./auth/session");
  const principal = req ? await getPrincipalFromRequest(req) : await getPrincipal();
  return authorize(principal, need);
}
