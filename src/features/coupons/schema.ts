import { z } from "zod";
import { halalas, isoDate, locale, paged, uuid } from "@/features/common/schema";
import { vendorCardDTO } from "@/features/catalog/schema";
import { COUPON_APPROVAL_STATUSES, COUPON_TYPES } from "@/features/admin/constants";

/**
 * Coupons (P2-02, SPEC 6.1 + D18, finance.md §6.2).
 *
 * Store (cart + checkout) — Server Actions in features/coupons/actions.ts:
 *   applyCouponAction(applyCouponInput)   -> ActionResult<CartDTO>   (cart.coupon filled)
 *   removeCouponAction(removeCouponInput) -> ActionResult<CartDTO>
 * Errors: COUPON_INVALID (unknown, inactive, not approved — one code, no existence oracle),
 *   COUPON_EXPIRED (outside startsAt..endsAt), COUPON_MIN_ORDER (minOrder in `issues`-free form:
 *   the cart shows `coupon.minOrder`), COUPON_LIMIT_REACHED (usageLimit / perUserLimit),
 *   COUPON_NOT_APPLICABLE (no cart line matches the store / categories), COUPON_LOGIN_REQUIRED
 *   (perUserLimit coupons need a signed-in customer), RATE_LIMITED (code guessing).
 *
 * Rules
 * - One coupon per cart. The cart re-validates it on every read; a coupon that stops applying is
 *   shown with `valid: false` + `invalidReason` and contributes 0 (never silently dropped).
 * - PUBLIC coupon (vendorId null): borne by the platform, split over sub-orders pro rata (largest
 *   remainder), does NOT reduce vendorNet. STORE coupon: applies to that store's lines only,
 *   borne by the store (vendorDiscountShare), reduces the commission base.
 * - FREE_SHIPPING: shipping of the matching shipments = 0 (public: platform bears it; O13 for
 *   self-shipping stores is pending the owner — until then a public FREE_SHIPPING coupon only
 *   frees PLATFORM_SHIPPING shipments).
 * - D18: a PUBLIC coupon whose effective rate >= platformCouponApprovalBps (1000) needs the
 *   owner's (SUPER_ADMIN) approval before it can be activated. FIXED coupons are compared as
 *   value / minOrder (no minOrder = always needs approval).
 */
export const couponType = z.enum(COUPON_TYPES);
export const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/);

export const applyCouponInput = z.object({ code: couponCode, locale: locale.default("ar") }).strict();
export const removeCouponInput = z.object({ locale: locale.default("ar") }).strict();

export const COUPON_INVALID_REASONS = [
  "COUPON_INVALID",
  "COUPON_EXPIRED",
  "COUPON_MIN_ORDER",
  "COUPON_LIMIT_REACHED",
  "COUPON_NOT_APPLICABLE",
  "COUPON_LOGIN_REQUIRED",
] as const;

/** The coupon on a cart / checkout summary. */
export const appliedCouponDTO = z
  .object({
    code: z.string(),
    type: couponType,
    /** PERCENT: bps; FIXED: halalas; FREE_SHIPPING: 0 */
    value: z.number().int().nonnegative(),
    /** PLATFORM = Souq AlZal coupon; STORE = one store's coupon (only its lines) */
    scope: z.enum(["PLATFORM", "STORE"]),
    vendor: vendorCardDTO.nullable(),
    minOrder: halalas.nullable(),
    /** items discount in halalas (FREE_SHIPPING: 0 here, see shippingDiscount on the summary) */
    discount: halalas,
    valid: z.boolean(),
    invalidReason: z.enum(COUPON_INVALID_REASONS).nullable(),
    endsAt: isoDate,
  })
  .strict();
export type AppliedCouponDTO = z.infer<typeof appliedCouponDTO>;

// ------------------------------------------------------------------ admin (/admin/coupons, cms.manage)
/**
 * Server Actions in features/coupons/actions.ts:
 *   listCouponsAction(adminCouponListInput)  -> ActionResult<AdminCouponListDTO>
 *   saveCouponAction(couponUpsertInput)      -> ActionResult<AdminCouponDTO>  (create or update)
 *   setCouponActiveAction({ id, active })    -> ActionResult<AdminCouponDTO>
 *     COUPON_APPROVAL_REQUIRED when D18 applies and the coupon is not APPROVED yet
 *   decideCouponAction({ id, approve, note }) -> ActionResult<AdminCouponDTO>   SUPER_ADMIN only
 * Every write is in audit_logs. Store coupons (vendorId) are created by stores in /vendor (P4).
 */
export const couponApprovalStatus = z.enum(COUPON_APPROVAL_STATUSES);

export const couponUpsertInput = z
  .object({
    id: uuid.optional(),
    code: couponCode,
    type: couponType,
    value: z.number().int().nonnegative(),
    minOrder: halalas.nullable().default(null),
    maxDiscount: halalas.nullable().default(null),
    appliesToCategoryIds: z.array(uuid).max(50).default([]),
    usageLimit: z.number().int().positive().nullable().default(null),
    perUserLimit: z.number().int().positive().nullable().default(null),
    startsAt: isoDate,
    endsAt: isoDate,
  })
  .strict()
  .refine((c) => (c.type === "PERCENT" ? c.value >= 1 && c.value <= 10_000 : true), { path: ["value"] })
  .refine((c) => (c.type === "FIXED" ? c.value >= 1 : true), { path: ["value"] })
  .refine((c) => Date.parse(c.endsAt) > Date.parse(c.startsAt), { path: ["endsAt"] });
export type CouponUpsertInput = z.input<typeof couponUpsertInput>;

export const setCouponActiveInput = z.object({ id: uuid, active: z.boolean() }).strict();
export const decideCouponInput = z
  .object({ id: uuid, approve: z.boolean(), note: z.string().trim().max(500).nullable().default(null) })
  .strict();

export const adminCouponDTO = z
  .object({
    id: uuid,
    code: z.string(),
    type: couponType,
    value: z.number().int().nonnegative(),
    minOrder: halalas.nullable(),
    maxDiscount: halalas.nullable(),
    appliesToCategoryIds: z.array(uuid),
    /** null = public (platform) coupon */
    vendor: z.object({ id: uuid, nameAr: z.string() }).strict().nullable(),
    usageLimit: z.number().int().nullable(),
    perUserLimit: z.number().int().nullable(),
    usedCount: z.number().int().nonnegative(),
    startsAt: isoDate,
    endsAt: isoDate,
    isActive: z.boolean(),
    approvalStatus: couponApprovalStatus,
    /** D18: true when this coupon needs (or needed) the owner's approval */
    requiresApproval: z.boolean(),
    approvedAt: isoDate.nullable(),
    createdAt: isoDate,
  })
  .strict();
export type AdminCouponDTO = z.infer<typeof adminCouponDTO>;

export const adminCouponListInput = z
  .object({
    q: z.string().trim().max(40).optional(),
    approval: couponApprovalStatus.optional(),
    page: z.number().int().min(1).max(10_000).default(1),
    perPage: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export const adminCouponListDTO = paged(adminCouponDTO);
export type AdminCouponListDTO = z.infer<typeof adminCouponListDTO>;
