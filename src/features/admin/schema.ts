import { z } from "zod";
import { halalas, isoDate, paged, positiveHalalas, slug, uuid } from "@/features/common/schema";
import {
  addressSnapshotDTO,
  orderStatus,
  paymentMethod,
  paymentStatus,
  subOrderStatus,
} from "@/features/orders/schema";
import {
  ADMIN_SECTIONS,
  COUPON_APPROVAL_STATUSES,
  COUPON_TYPES,
  DASHBOARD_PERIODS,
  PRODUCT_STATUSES,
  SETTING_GROUPS,
  STAFF_PERMISSIONS,
} from "./constants";

/**
 * /admin contracts for M1-03 (SPEC §7.2, D29: the admin UI is Arabic only, but DTOs carry both
 * languages because the admin edits both). Every service starts with requirePermission(admin(...)):
 *
 *   section      permission          notes
 *   dashboard    reports.view        the KPIs; the dashboard shell itself is open to any staff
 *   products     products.review     list + create/edit (platform products, vendorId = null, D6)
 *   categories   products.review     list (tree)
 *   orders       orders.manage       read only in M1
 *   customers    customers.view      read only
 *   coupons      cms.manage          list/create/edit; D18 approval = SUPER_ADMIN only (P2-02)
 *   settings     settings.manage     view only in M1
 *   staff        SUPER_ADMIN only    D36-6 / QA-G11
 *   audit        SUPER_ADMIN only    read only (contains before/after of sensitive changes)
 *
 * `getAdminCapabilities()` returns this matrix for the signed-in staff so the sidebar shows only
 * what the person may open (a STAFF with partial permissions sees only those sections).
 */
export const staffPermission = z.enum(STAFF_PERMISSIONS);

/**
 * A customer phone in an admin DTO is MASKED ON THE SERVER ("+9665******12", lib/phone maskPhone):
 * the raw number never reaches the browser (README 4.6; revealing it is an audited action, P3-01).
 * The regex makes a forgotten mask a parse error instead of a leak.
 */
export const maskedPhone = z.string().regex(/^(?:\+9665\*{6}\d{2}|\*\*\*)$/);

/** Client components: import these arrays from ./constants (no server imports there). */
export { ADMIN_SECTIONS, DASHBOARD_PERIODS, PRODUCT_STATUSES, SETTING_GROUPS, COUPON_TYPES, COUPON_APPROVAL_STATUSES };
export const adminSection = z.enum(ADMIN_SECTIONS);
export type AdminSection = z.infer<typeof adminSection>;

export const adminCapabilitiesDTO = z
  .object({
    userId: uuid,
    name: z.string(),
    role: z.enum(["SUPER_ADMIN", "STAFF"]),
    permissions: z.array(staffPermission),
    sections: z.record(adminSection, z.boolean()),
  })
  .strict();
export type AdminCapabilitiesDTO = z.infer<typeof adminCapabilitiesDTO>;

// =================================================================== dashboard (KPIs)
export const dashboardInput = z.object({ period: z.enum(DASHBOARD_PERIODS).default("30d") }).strict();

const kpi = z
  .object({
    value: z.number().int(),
    /** same-length previous period, for the trend arrow */
    previous: z.number().int(),
  })
  .strict();

export const adminDashboardDTO = z
  .object({
    period: z.enum(DASHBOARD_PERIODS),
    from: isoDate,
    to: isoDate,
    /** paid orders only (status not PENDING_PAYMENT/CANCELLED, paymentStatus PAID/PARTIALLY_REFUNDED) */
    kpis: z
      .object({
        sales: kpi, // halalas, grand totals
        orders: kpi,
        averageOrder: kpi, // halalas
        newCustomers: kpi,
        platformCommission: kpi, // halalas
      })
      .strict(),
    /** wallet balances owed to stores right now (not period based) */
    vendorBalances: z.object({ pending: halalas, available: halalas }).strict(),
    /** one point per day (Asia/Riyadh), halalas */
    salesChart: z.array(z.object({ date: z.string(), sales: halalas, orders: z.number().int() }).strict()),
    topProducts: z.array(
      z.object({ productId: uuid.nullable(), name: z.string(), qty: z.number().int(), sales: halalas }).strict(),
    ),
    topVendors: z.array(
      z.object({ vendorId: uuid.nullable(), name: z.string(), orders: z.number().int(), sales: halalas }).strict(),
    ),
    pendingReviewProducts: z.number().int().nonnegative(),
    lowStock: z.array(
      z
        .object({
          productId: uuid,
          productName: z.string(),
          variantId: uuid,
          sku: z.string(),
          available: z.number().int(),
        })
        .strict(),
    ),
  })
  .strict();
export type AdminDashboardDTO = z.infer<typeof adminDashboardDTO>;

// =================================================================== products
export const productStatus = z.enum(PRODUCT_STATUSES);

export const adminProductListInput = z
  .object({
    q: z.string().trim().max(80).optional(),
    status: productStatus.optional(),
    categoryId: uuid.optional(),
    /** "platform" = vendorId null; a uuid = that store */
    vendor: z.union([z.literal("platform"), uuid]).optional(),
    sort: z
      .enum(["updated_desc", "created_desc", "name_asc", "price_asc", "price_desc", "stock_asc"])
      .default("updated_desc"),
    page: z.number().int().min(1).max(10_000).default(1),
    perPage: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export type AdminProductListInput = z.input<typeof adminProductListInput>;

export const adminProductRowDTO = z
  .object({
    id: uuid,
    slug: z.string(),
    nameAr: z.string(),
    nameEn: z.string(),
    imageUrl: z.string().nullable(),
    category: z.object({ id: uuid, nameAr: z.string() }).strict(),
    vendor: z.object({ id: uuid, nameAr: z.string() }).strict().nullable(),
    status: productStatus,
    isFeatured: z.boolean(),
    priceMin: halalas,
    priceMax: halalas,
    /** sum over active variants of stock - reservedStock */
    available: z.number().int(),
    variantCount: z.number().int().nonnegative(),
    soldCount: z.number().int().nonnegative(),
    /** platform products are editable; vendor products are read-only here until P3 review */
    editable: z.boolean(),
    updatedAt: isoDate,
  })
  .strict();
export type AdminProductRowDTO = z.infer<typeof adminProductRowDTO>;
export const adminProductListDTO = paged(adminProductRowDTO);
export type AdminProductListDTO = z.infer<typeof adminProductListDTO>;

/** Server-generated storage keys only (upload route). "demo/" = seed illustrations. */
export const productImagePath = z
  .string()
  .max(200)
  .regex(/^(products\/[a-z0-9-]+|demo\/[a-z0-9-]+)\/[a-z0-9-]+\.(jpg|jpeg|png|webp|avif|svg)$/);

export const optionValueInput = z
  .object({
    /** client-side key that variants reference (an existing value id, or any temp string) */
    key: z.string().min(1).max(64),
    valueAr: z.string().trim().min(1).max(40),
    valueEn: z.string().trim().min(1).max(40),
  })
  .strict();
export const optionInput = z
  .object({
    nameAr: z.string().trim().min(1).max(40),
    nameEn: z.string().trim().min(1).max(40),
    values: z.array(optionValueInput).min(1).max(30),
  })
  .strict();
export const variantInput = z
  .object({
    /** existing variant id (edit); omit for a new variant */
    id: uuid.optional(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/),
    /** one key per option, in option order; [] when the product has no options */
    optionValueKeys: z.array(z.string().min(1).max(64)).max(3),
    price: positiveHalalas,
    compareAtPrice: positiveHalalas.nullable().default(null),
    stock: z.number().int().min(0).max(1_000_000),
    weightGrams: z.number().int().min(0).max(100_000).nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .strict();

/**
 * Create / edit a PLATFORM product (vendorId = null, D6). On edit, options are replaced as a whole,
 * variants are matched by id (a variant left out is deactivated — variants are never deleted
 * because carts/orders reference them), images are replaced in the given order.
 */
export const productUpsertInput = z
  .object({
    nameAr: z.string().trim().min(2).max(120),
    nameEn: z.string().trim().min(2).max(120),
    /** optional: generated from nameEn when empty */
    slug: slug.optional(),
    categoryId: uuid,
    descriptionAr: z.string().max(10_000).nullable().default(null),
    descriptionEn: z.string().max(10_000).nullable().default(null),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    isFeatured: z.boolean().default(false),
    weightGrams: z.number().int().min(0).max(100_000).default(0),
    seoTitle: z.string().trim().max(70).nullable().default(null),
    seoDescription: z.string().trim().max(170).nullable().default(null),
    options: z.array(optionInput).max(3).default([]),
    variants: z.array(variantInput).min(1).max(100),
    images: z
      .array(z.object({ path: productImagePath, alt: z.string().trim().max(120).nullable().default(null) }).strict())
      .max(12)
      .default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    const keys = v.options.map((o) => new Set(o.values.map((x) => x.key)));
    const combos = new Set<string>();
    const skus = new Set<string>();
    v.variants.forEach((variant, i) => {
      if (variant.optionValueKeys.length !== v.options.length)
        ctx.addIssue({ code: "custom", path: ["variants", i, "optionValueKeys"], message: "one value per option" });
      else if (variant.optionValueKeys.some((k, j) => !keys[j]!.has(k)))
        ctx.addIssue({ code: "custom", path: ["variants", i, "optionValueKeys"], message: "unknown option value" });
      const combo = variant.optionValueKeys.join("|");
      if (combos.has(combo)) ctx.addIssue({ code: "custom", path: ["variants", i], message: "duplicate combination" });
      combos.add(combo);
      if (skus.has(variant.sku))
        ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "duplicate sku" });
      skus.add(variant.sku);
      if (variant.compareAtPrice !== null && variant.compareAtPrice <= variant.price)
        ctx.addIssue({ code: "custom", path: ["variants", i, "compareAtPrice"], message: "must exceed price" });
    });
    if (!v.variants.some((x) => x.isActive))
      ctx.addIssue({ code: "custom", path: ["variants"], message: "at least one active variant" });
    v.options.forEach((o, i) => {
      const seen = new Set<string>();
      o.values.forEach((x, j) => {
        if (seen.has(x.key)) ctx.addIssue({ code: "custom", path: ["options", i, "values", j, "key"], message: "dup" });
        seen.add(x.key);
      });
    });
  });
export type ProductUpsertInput = z.input<typeof productUpsertInput>;
export const productUpdateInput = z.object({ id: uuid, data: productUpsertInput }).strict();

/** Full product for the edit form (no negotiation secrets: floorPrice/autoAcceptPrice never here). */
export const adminProductDetailDTO = z
  .object({
    id: uuid,
    slug: z.string(),
    nameAr: z.string(),
    nameEn: z.string(),
    descriptionAr: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    categoryId: uuid,
    vendor: z.object({ id: uuid, nameAr: z.string() }).strict().nullable(),
    status: productStatus,
    rejectReason: z.string().nullable(),
    isFeatured: z.boolean(),
    weightGrams: z.number().int(),
    seoTitle: z.string().nullable(),
    seoDescription: z.string().nullable(),
    options: z.array(
      z
        .object({
          id: uuid,
          nameAr: z.string(),
          nameEn: z.string(),
          values: z.array(z.object({ id: uuid, key: z.string(), valueAr: z.string(), valueEn: z.string() }).strict()),
        })
        .strict(),
    ),
    variants: z.array(
      z
        .object({
          id: uuid,
          sku: z.string(),
          /** = option value ids, usable as `key` in productUpsertInput */
          optionValueKeys: z.array(z.string()),
          price: halalas,
          compareAtPrice: halalas.nullable(),
          stock: z.number().int(),
          reservedStock: z.number().int(),
          weightGrams: z.number().int().nullable(),
          isActive: z.boolean(),
        })
        .strict(),
    ),
    images: z.array(z.object({ path: z.string(), url: z.string(), alt: z.string().nullable() }).strict()),
    editable: z.boolean(),
    publishedAt: isoDate.nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
    /** public URL once published */
    storePath: z.string().nullable(),
  })
  .strict();
export type AdminProductDetailDTO = z.infer<typeof adminProductDetailDTO>;

export const productSavedDTO = z.object({ id: uuid, slug: z.string(), status: productStatus }).strict();

/** POST /api/admin/uploads/product-image (multipart: file) -> this */
export const uploadedImageDTO = z.object({ path: productImagePath, url: z.string() }).strict();
export type UploadedImageDTO = z.infer<typeof uploadedImageDTO>;

// =================================================================== categories
export const adminCategoryDTO = z
  .object({
    id: uuid,
    parentId: uuid.nullable(),
    slug: z.string(),
    nameAr: z.string(),
    nameEn: z.string(),
    imageUrl: z.string().nullable(),
    sort: z.number().int(),
    isActive: z.boolean(),
    showOnHome: z.boolean(),
    homeSort: z.number().int(),
    /** D26: false = platform products only */
    vendorsAllowed: z.boolean(),
    /** bps, null = default commission */
    commissionRate: z.number().int().nullable(),
    productCount: z.number().int().nonnegative(),
    publishedCount: z.number().int().nonnegative(),
    get children() {
      return z.array(adminCategoryDTO);
    },
  })
  .strict();
export type AdminCategoryDTO = {
  id: string;
  parentId: string | null;
  slug: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string | null;
  sort: number;
  isActive: boolean;
  showOnHome: boolean;
  homeSort: number;
  vendorsAllowed: boolean;
  commissionRate: number | null;
  productCount: number;
  publishedCount: number;
  children: AdminCategoryDTO[];
};

// =================================================================== orders (read only in M1)
export const adminOrderListInput = z
  .object({
    /** order number (SZ-…) or customer phone (+9665… / 05…) or name */
    q: z.string().trim().max(80).optional(),
    status: orderStatus.optional(),
    paymentStatus: paymentStatus.optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    page: z.number().int().min(1).max(10_000).default(1),
    perPage: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export type AdminOrderListInput = z.input<typeof adminOrderListInput>;

export const adminOrderRowDTO = z
  .object({
    id: uuid,
    number: z.string(),
    placedAt: isoDate,
    /** phone masked server-side (maskedPhone) */
    customer: z.object({ id: uuid, name: z.string(), phone: maskedPhone.nullable() }).strict(),
    status: orderStatus,
    paymentStatus,
    paymentMethod,
    grandTotal: halalas,
    itemCount: z.number().int(),
    subOrderCount: z.number().int(),
    city: z.string().nullable(),
  })
  .strict();
export const adminOrderListDTO = paged(adminOrderRowDTO);
export type AdminOrderListDTO = z.infer<typeof adminOrderListDTO>;

export const adminTimelineEventDTO = z
  .object({
    from: subOrderStatus.nullable(),
    to: subOrderStatus,
    at: isoDate,
    by: z.object({ id: uuid, name: z.string(), role: z.string() }).strict().nullable(),
    note: z.string().nullable(),
  })
  .strict();

export const adminSubOrderDTO = z
  .object({
    id: uuid,
    number: z.string(),
    status: subOrderStatus,
    vendor: z.object({ id: uuid, nameAr: z.string() }).strict().nullable(),
    lines: z.array(
      z
        .object({
          id: uuid,
          name: z.string(),
          optionsLabel: z.string(),
          sku: z.string().nullable(),
          imageUrl: z.string().nullable(),
          qty: z.number().int(),
          unitPrice: halalas,
          lineTotal: halalas,
          vatAmount: halalas,
        })
        .strict(),
    ),
    itemsGross: halalas,
    platformDiscountShare: halalas,
    vendorDiscountShare: halalas,
    shippingFee: halalas,
    vatAmount: halalas,
    total: halalas,
    commissionRate: z.number().int(),
    commissionAmount: halalas,
    vendorPayable: halalas,
    shippingMode: z.enum(["PLATFORM_SHIPPING", "SELF_SHIPPING"]),
    timeline: z.array(adminTimelineEventDTO),
    shipments: z.array(
      z
        .object({
          id: uuid,
          direction: z.string(),
          carrier: z.string().nullable(),
          trackingNumber: z.string().nullable(),
          status: z.string(),
          createdAt: isoDate,
        })
        .strict(),
    ),
  })
  .strict();

export const adminOrderDetailDTO = z
  .object({
    id: uuid,
    number: z.string(),
    placedAt: isoDate,
    paidAt: isoDate.nullable(),
    cancelledAt: isoDate.nullable(),
    status: orderStatus,
    paymentStatus,
    paymentMethod,
    customer: z
      .object({ id: uuid, name: z.string(), phone: maskedPhone.nullable(), email: z.string().nullable() })
      .strict(),
    /** recipientPhone masked server-side too (reveal = audited action, P3-01) */
    address: addressSnapshotDTO.extend({ recipientPhone: maskedPhone }).strict(),
    subtotal: halalas,
    discountTotal: halalas,
    shippingTotal: halalas,
    vatTotal: halalas,
    grandTotal: halalas,
    couponCode: z.string().nullable(),
    invoiceType: z.enum(["SIMPLIFIED", "STANDARD"]),
    subOrders: z.array(adminSubOrderDTO),
    payments: z.array(
      z
        .object({
          id: uuid,
          gateway: z.string(),
          status: z.string(),
          amount: halalas,
          refundedAmount: halalas,
          createdAt: isoDate,
        })
        .strict(),
    ),
  })
  .strict();
export type AdminOrderDetailDTO = z.infer<typeof adminOrderDetailDTO>;

// =================================================================== customers (read only)
export const adminCustomerListInput = z
  .object({
    q: z.string().trim().max(80).optional(),
    status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
    sort: z.enum(["created_desc", "orders_desc", "spent_desc"]).default("created_desc"),
    page: z.number().int().min(1).max(10_000).default(1),
    perPage: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export type AdminCustomerListInput = z.input<typeof adminCustomerListInput>;

export const adminCustomerRowDTO = z
  .object({
    id: uuid,
    name: z.string(),
    /** masked server-side (maskedPhone) */
    phone: maskedPhone.nullable(),
    email: z.string().nullable(),
    status: z.enum(["ACTIVE", "BLOCKED"]),
    ordersCount: z.number().int().nonnegative(),
    /** paid orders only */
    totalSpent: halalas,
    lastOrderAt: isoDate.nullable(),
    createdAt: isoDate,
  })
  .strict();
export const adminCustomerListDTO = paged(adminCustomerRowDTO);
export type AdminCustomerListDTO = z.infer<typeof adminCustomerListDTO>;

export const adminCustomerDetailDTO = adminCustomerRowDTO
  .extend({
    locale: z.enum(["ar", "en"]),
    lastLoginAt: isoDate.nullable(),
    addresses: z.array(
      z
        .object({
          id: uuid,
          label: z.string().nullable(),
          city: z.string(),
          district: z.string(),
          isDefault: z.boolean(),
        })
        .strict(),
    ),
    recentOrders: z.array(adminOrderRowDTO),
  })
  .strict();
export type AdminCustomerDetailDTO = z.infer<typeof adminCustomerDetailDTO>;

// =================================================================== settings (view only in M1)
export const adminSettingDTO = z
  .object({
    key: z.string(),
    group: z.enum(SETTING_GROUPS),
    value: z.unknown(),
    isPublic: z.boolean(),
    description: z.string().nullable(),
    /** default value awaiting the owner's decision (D27, O1/O3/O7/O10/O14) */
    pendingOwner: z.boolean(),
    updatedAt: isoDate.nullable(),
    updatedBy: z.object({ id: uuid, name: z.string() }).strict().nullable(),
  })
  .strict();
export type AdminSettingDTO = z.infer<typeof adminSettingDTO>;
export const adminSettingsDTO = z.object({ settings: z.array(adminSettingDTO) }).strict();
export type AdminSettingsDTO = z.infer<typeof adminSettingsDTO>;

// =================================================================== staff (SUPER_ADMIN only)
export const adminStaffRowDTO = z
  .object({
    id: uuid,
    name: z.string(),
    email: z.string().nullable(),
    /** masked +9665****1234 */
    phoneMasked: z.string().nullable(),
    role: z.enum(["SUPER_ADMIN", "STAFF"]),
    permissions: z.array(staffPermission),
    status: z.enum(["ACTIVE", "BLOCKED"]),
    lastLoginAt: isoDate.nullable(),
    createdAt: isoDate,
    isSelf: z.boolean(),
  })
  .strict();
export const adminStaffListDTO = z
  .object({ staff: z.array(adminStaffRowDTO), allPermissions: z.array(staffPermission) })
  .strict();
export type AdminStaffListDTO = z.infer<typeof adminStaffListDTO>;

// =================================================================== audit log (SUPER_ADMIN only, read)
export const auditLogListInput = z
  .object({
    entity: z.string().trim().max(60).optional(),
    action: z.string().trim().max(80).optional(),
    actorUserId: uuid.optional(),
    entityId: z.string().trim().max(80).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    page: z.number().int().min(1).max(10_000).default(1),
    perPage: z.number().int().min(1).max(100).default(50),
  })
  .strict();
export type AuditLogListInput = z.input<typeof auditLogListInput>;

export const auditLogRowDTO = z
  .object({
    id: uuid,
    createdAt: isoDate,
    actor: z.object({ id: uuid, name: z.string() }).strict().nullable(),
    actorRole: z.string().nullable(),
    action: z.string(),
    entity: z.string(),
    entityId: z.string().nullable(),
    /** already redacted on write (redactForAudit) */
    before: z.unknown(),
    after: z.unknown(),
    ip: z.string().nullable(),
  })
  .strict();
export const auditLogListDTO = paged(auditLogRowDTO);
export type AuditLogListDTO = z.infer<typeof auditLogListDTO>;
