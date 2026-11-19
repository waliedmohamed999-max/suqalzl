import { describe, expect, it } from "vitest";
import {
  account,
  admin,
  authorize,
  can,
  PermissionDeniedError,
  sanitizeStaffPermissions,
  sanitizeVendorPermissions,
  UnauthorizedError,
  vendor,
  VENDOR_CAPABILITIES,
  type Principal,
  type VendorCapability,
  type VendorStatus,
} from "@/lib/permissions";

const U = "11111111-1111-4111-8111-111111111111";
const V = "22222222-2222-4222-8222-222222222222";
const superAdmin: Principal = { kind: "staff", userId: U, role: "SUPER_ADMIN", permissions: [] };
const staffOrders: Principal = { kind: "staff", userId: U, role: "STAFF", permissions: ["orders.manage"] };
const owner: Principal = {
  kind: "vendor",
  userId: U,
  vendorId: V,
  role: "VENDOR_OWNER",
  permissions: [],
  vendorStatus: "APPROVED",
};
const vstaff: Principal = {
  kind: "vendor",
  userId: U,
  vendorId: V,
  role: "VENDOR_STAFF",
  permissions: ["orders.fulfill"],
  vendorStatus: "APPROVED",
};
const customer: Principal = { kind: "customer", userId: U, role: "CUSTOMER" };

describe("SPEC §4 roles", () => {
  it("SUPER_ADMIN can everything in admin, nothing in vendor", () => {
    expect(can(superAdmin, admin("settings.manage"))).toBe(true);
    expect(can(superAdmin, admin("super"))).toBe(true);
    expect(can(superAdmin, vendor("products.manage"))).toBe(false);
  });
  it("STAFF only has listed permissions and never 'super'", () => {
    expect(can(staffOrders, admin("orders.manage"))).toBe(true);
    expect(can(staffOrders, admin("payouts.manage"))).toBe(false);
    expect(can(staffOrders, admin("super"))).toBe(false);
  });
  it("VENDOR_OWNER has all vendor permissions incl. owner-only", () => {
    expect(can(owner, vendor("finance.view"))).toBe(true);
    expect(can(owner, vendor("vendor.bank.manage"))).toBe(true);
    expect(can(owner, admin("orders.manage"))).toBe(false);
  });
  it("VENDOR_STAFF has delegated permissions only, never owner-only", () => {
    expect(can(vstaff, vendor("orders.fulfill"))).toBe(true);
    expect(can(vstaff, vendor("finance.view"))).toBe(false);
    expect(can(vstaff, vendor("vendor.team.manage"))).toBe(false);
  });
  it("CUSTOMER: account only", () => {
    expect(can(customer, account())).toBe(true);
    expect(can(customer, admin("orders.manage"))).toBe(false);
    expect(can(customer, vendor("products.manage"))).toBe(false);
    expect(can(null, account())).toBe(false);
  });
});

describe("authorize → RLS context", () => {
  it("401 without principal, 403 without permission", () => {
    expect(() => authorize(null, account())).toThrow(UnauthorizedError);
    expect(() => authorize(customer, admin("orders.manage"))).toThrow(PermissionDeniedError);
  });
  it("vendorId in the context comes from the principal (session), never from input", () => {
    expect(authorize(owner, vendor("products.manage")).ctx).toEqual({ kind: "vendor", userId: U, vendorId: V });
    expect(authorize(staffOrders, admin("orders.manage")).ctx).toEqual({ kind: "admin", userId: U });
  });
  it("staff and vendors use their account area as customers", () => {
    expect(authorize(owner, account()).ctx).toEqual({ kind: "customer", userId: U });
    expect(authorize(superAdmin, account()).ctx).toEqual({ kind: "customer", userId: U });
  });
  it("permission arrays are sanitised before saving", () => {
    expect(sanitizeStaffPermissions(["orders.manage", "orders.manage", "root", "products.manage"])).toEqual([
      "orders.manage",
    ]);
    expect(sanitizeVendorPermissions(["products.manage", "orders.manage", "vendor.bank.manage"])).toEqual([
      "products.manage",
    ]);
  });
});

describe("D36-3 / QA-B8: vendor capabilities by store status (central allowlist)", () => {
  const STATUSES: VendorStatus[] = ["PENDING", "REJECTED", "SUSPENDED", "APPROVED"];
  const ownerIn = (vendorStatus: VendorStatus): Principal => ({ ...owner, vendorStatus }) as Principal;
  const fullStaffIn = (vendorStatus: VendorStatus): Principal =>
    ({
      ...vstaff,
      permissions: ["products.manage", "orders.fulfill", "finance.view", "reviews.reply"],
      vendorStatus,
    }) as Principal;

  // expected for the OWNER (every role permission held) — the full matrix, 4 statuses x 14 capabilities
  const OWNER_ALLOWED: Record<VendorStatus, VendorCapability[]> = {
    PENDING: ["vendor.application.manage"],
    REJECTED: ["vendor.application.manage"],
    SUSPENDED: [
      "vendor.read",
      "orders.fulfill",
      "finance.view",
      "finance.invoice.upload",
      "finance.payout.request",
      "vendor.team.remove",
    ],
    APPROVED: VENDOR_CAPABILITIES.filter((c) => c !== "vendor.application.manage"),
  };

  for (const status of STATUSES) {
    it(`owner of a ${status} store`, () => {
      for (const cap of VENDOR_CAPABILITIES) {
        expect([cap, can(ownerIn(status), vendor(cap))]).toEqual([cap, OWNER_ALLOWED[status].includes(cap)]);
      }
    });
  }

  it("SUSPENDED: fulfils existing orders and sees finance, but no products/prices/deals/negotiation/IBAN", () => {
    const o = ownerIn("SUSPENDED");
    expect(can(o, vendor("orders.fulfill"))).toBe(true);
    expect(can(o, vendor("finance.payout.request"))).toBe(true);
    for (const cap of [
      "products.manage",
      "deals.manage",
      "negotiation.respond",
      "reviews.reply",
      "vendor.team.manage",
      "vendor.profile.manage",
      "vendor.bank.manage",
    ] as const)
      expect(can(o, vendor(cap))).toBe(false);
  });

  it("VENDOR_STAFF with every delegable permission: never owner-only, never beyond the status", () => {
    expect(can(fullStaffIn("APPROVED"), vendor("products.manage"))).toBe(true);
    expect(can(fullStaffIn("APPROVED"), vendor("negotiation.respond"))).toBe(true);
    expect(can(fullStaffIn("APPROVED"), vendor("finance.payout.request"))).toBe(false); // owner-only
    expect(can(fullStaffIn("APPROVED"), vendor("vendor.profile.manage"))).toBe(false); // G7
    expect(can(fullStaffIn("SUSPENDED"), vendor("products.manage"))).toBe(false);
    expect(can(fullStaffIn("SUSPENDED"), vendor("orders.fulfill"))).toBe(true);
    expect(can(fullStaffIn("PENDING"), vendor("vendor.application.manage"))).toBe(false); // owner only
    expect(can(fullStaffIn("PENDING"), vendor("vendor.read"))).toBe(false);
  });

  it("authorize() throws 403 for a capability the status forbids", () => {
    expect(() => authorize(ownerIn("SUSPENDED"), vendor("products.manage"))).toThrow(PermissionDeniedError);
    expect(authorize(ownerIn("SUSPENDED"), vendor("orders.fulfill")).ctx).toEqual({
      kind: "vendor",
      userId: U,
      vendorId: V,
    });
  });
});
