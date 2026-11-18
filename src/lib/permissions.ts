/**
 * Roles and permissions (SPEC §4). Pure functions here; the session lookup lives in lib/auth.
 *
 * Rules (SPEC §4, CLAUDE.md rule 8):
 * - Every Server Action and Route Handler starts with requirePermission(...) / requireArea(...).
 * - vendorId ALWAYS comes from the server session (Principal.vendorId), never from the client.
 * - authorize() returns the RLS context to use with withCtx(): admin / vendor / customer.
 */
import type { Ctx } from "./db";

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

export const VENDOR_PERMISSIONS = ["products.manage", "orders.fulfill", "finance.view", "reviews.reply"] as const;
export type VendorPermission = (typeof VENDOR_PERMISSIONS)[number];

/** Owner-only vendor actions (team, bank details, settings) are not delegable to VENDOR_STAFF. */
export const VENDOR_OWNER_ONLY = ["vendor.team.manage", "vendor.bank.manage", "vendor.profile.manage"] as const;
export type VendorOwnerPermission = (typeof VENDOR_OWNER_ONLY)[number];

export type Permission =
  | { area: "admin"; perm: StaffPermission | "super" }
  | { area: "vendor"; perm: VendorPermission | VendorOwnerPermission }
  | { area: "account" };

export type Principal =
  | { kind: "customer"; userId: string; role: "CUSTOMER" | "SUPER_ADMIN" | "STAFF" | "VENDOR_OWNER" | "VENDOR_STAFF" }
  | { kind: "staff"; userId: string; role: "SUPER_ADMIN" | "STAFF"; permissions: readonly string[] }
  | {
      kind: "vendor";
      userId: string;
      vendorId: string;
      role: "VENDOR_OWNER" | "VENDOR_STAFF";
      permissions: readonly string[];
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
    case "vendor":
      if (principal.kind !== "vendor") return false;
      if (principal.role === "VENDOR_OWNER") return true;
      if ((VENDOR_OWNER_ONLY as readonly string[]).includes(need.perm)) return false;
      return principal.permissions.includes(need.perm);
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
export const vendor = (perm: VendorPermission | VendorOwnerPermission): Permission => ({ area: "vendor", perm });
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
