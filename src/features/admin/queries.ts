import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { NotFoundError, withCtx, type Ctx, type Tx } from "@/lib/db";
import { mediaUrl } from "@/lib/providers/storage";
import { maskPhone, normalizeSaudiMobile } from "@/lib/phone";
import {
  PermissionDeniedError,
  STAFF_PERMISSIONS,
  UnauthorizedError,
  admin,
  authorize,
  can,
  isStaffPermission,
  type Permission,
  type Principal,
} from "@/lib/permissions";
import { DEFAULT_SETTINGS, PENDING_OWNER_KEYS, type SettingKey } from "@/lib/settings";
import { parseAddressSnapshot, parseItemSnapshot } from "@/features/orders/snapshot";
import {
  ADMIN_SECTIONS,
  adminCapabilitiesDTO,
  adminCategoryDTO,
  adminCustomerDetailDTO,
  adminCustomerListDTO,
  adminCustomerListInput,
  adminDashboardDTO,
  adminOrderDetailDTO,
  adminOrderListDTO,
  adminOrderListInput,
  adminSettingsDTO,
  adminStaffListDTO,
  auditLogListDTO,
  auditLogListInput,
  dashboardInput,
  type AdminCapabilitiesDTO,
  type AdminCategoryDTO,
  type AdminCustomerDetailDTO,
  type AdminCustomerListDTO,
  type AdminDashboardDTO,
  type AdminOrderDetailDTO,
  type AdminOrderListDTO,
  type AdminSection,
  type AdminSettingDTO,
  type AdminSettingsDTO,
  type AdminStaffListDTO,
  type AuditLogListDTO,
} from "./schema";

/**
 * /admin read services (M1-03). Each one authorizes the principal itself (defence in depth: the
 * Server Action already called requirePermission) and runs in the `admin` RLS context.
 * SECTION_PERMISSION is the single source of the section -> permission matrix (also the sidebar).
 */
export const SECTION_PERMISSION: Record<AdminSection, Permission> = {
  dashboard: admin("reports.view"),
  products: admin("products.review"),
  categories: admin("products.review"),
  orders: admin("orders.manage"),
  customers: admin("customers.view"),
  settings: admin("settings.manage"),
  staff: admin("super"),
  audit: admin("super"),
};
export const guardSection = (p: Principal | null, s: AdminSection): { principal: Principal; ctx: Ctx } =>
  authorize(p, SECTION_PERMISSION[s]);

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

// ================================================================= capabilities
/** Any staff session (no specific permission): what the sidebar may show. */
export async function getAdminCapabilities(principal: Principal | null): Promise<AdminCapabilitiesDTO> {
  if (!principal) throw new UnauthorizedError();
  if (principal.kind !== "staff") throw new PermissionDeniedError();
  return withCtx({ kind: "admin", userId: principal.userId }, async (tx) => {
    const u = await tx.user.findUnique({ where: { id: principal.userId }, select: { name: true } });
    return adminCapabilitiesDTO.parse({
      userId: principal.userId,
      name: u?.name ?? "",
      role: principal.role,
      permissions:
        principal.role === "SUPER_ADMIN" ? [...STAFF_PERMISSIONS] : principal.permissions.filter(isStaffPermission),
      sections: Object.fromEntries(ADMIN_SECTIONS.map((s) => [s, can(principal, SECTION_PERMISSION[s])])),
    });
  });
}

// ================================================================= dashboard
const RIYADH_OFFSET_MS = 3 * 3600_000; // Asia/Riyadh = UTC+3, no DST
export function periodBounds(period: "today" | "7d" | "30d" | "90d", now = new Date()) {
  const to = now;
  let from: Date;
  if (period === "today") {
    const local = new Date(now.getTime() + RIYADH_OFFSET_MS);
    local.setUTCHours(0, 0, 0, 0);
    from = new Date(local.getTime() - RIYADH_OFFSET_MS);
  } else {
    const days = { "7d": 7, "30d": 30, "90d": 90 }[period];
    from = new Date(now.getTime() - days * 86_400_000);
  }
  const len = to.getTime() - from.getTime();
  return { from, to, prevFrom: new Date(from.getTime() - len), prevTo: from };
}

async function salesBetween(tx: Tx, from: Date, to: Date) {
  const r = await tx.$queryRaw<{ sales: bigint | null; orders: bigint; commission: bigint | null }[]>`
    SELECT coalesce(sum(o.grand_total), 0) AS sales, count(*) AS orders,
           coalesce((SELECT sum(s.commission_amount) FROM sub_orders s
                     JOIN orders o2 ON o2.id = s.order_id
                     WHERE o2.payment_status::text IN ('PAID', 'PARTIALLY_REFUNDED') AND o2.status::text <> 'CANCELLED'
                       AND o2.placed_at >= ${from} AND o2.placed_at < ${to}), 0) AS commission
    FROM orders o
    WHERE o.payment_status::text IN ('PAID', 'PARTIALLY_REFUNDED') AND o.status::text <> 'CANCELLED'
      AND o.placed_at >= ${from} AND o.placed_at < ${to}`;
  const row = r[0]!;
  const customers = await tx.user.count({ where: { role: "CUSTOMER", createdAt: { gte: from, lt: to } } });
  const sales = num(row.sales);
  const orders = num(row.orders);
  return { sales, orders, avg: orders ? Math.round(sales / orders) : 0, commission: num(row.commission), customers };
}

export async function getAdminDashboard(
  principal: Principal | null,
  raw: unknown = {},
  now = new Date(),
): Promise<AdminDashboardDTO> {
  const { ctx } = guardSection(principal, "dashboard");
  const { period } = dashboardInput.parse(raw);
  const b = periodBounds(period, now);
  return withCtx(ctx, async (tx) => {
    const [cur, prev] = [await salesBetween(tx, b.from, b.to), await salesBetween(tx, b.prevFrom, b.prevTo)];
    const balances = await tx.walletTransaction.groupBy({
      by: ["status"],
      where: { status: { in: ["PENDING", "AVAILABLE"] } },
      _sum: { amount: true },
    });
    const bal = (s: string) => Math.max(0, num(balances.find((x) => x.status === s)?._sum.amount));
    const chart = await tx.$queryRaw<{ d: string; sales: bigint; orders: bigint }[]>`
      SELECT to_char((o.placed_at AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') AS d,
             sum(o.grand_total) AS sales, count(*) AS orders
      FROM orders o
      WHERE o.payment_status::text IN ('PAID', 'PARTIALLY_REFUNDED') AND o.status::text <> 'CANCELLED'
        AND o.placed_at >= ${b.from} AND o.placed_at < ${b.to}
      GROUP BY 1 ORDER BY 1`;
    // one point per day, zero-filled
    const byDay = new Map(chart.map((c) => [c.d, c]));
    const salesChart: { date: string; sales: number; orders: number }[] = [];
    const day = new Date(b.from.getTime() + RIYADH_OFFSET_MS);
    day.setUTCHours(0, 0, 0, 0);
    const end = new Date(b.to.getTime() + RIYADH_OFFSET_MS);
    for (let i = 0; day <= end && i < 120; i++) {
      const key = day.toISOString().slice(0, 10);
      const c = byDay.get(key);
      salesChart.push({ date: key, sales: num(c?.sales), orders: num(c?.orders) });
      day.setUTCDate(day.getUTCDate() + 1);
    }
    const topProducts = await tx.$queryRaw<{ pid: string | null; name: string | null; qty: bigint; sales: bigint }[]>`
      SELECT i.product_snapshot->>'productId' AS pid, max(i.product_snapshot->>'nameAr') AS name,
             sum(i.qty) AS qty, sum(i.line_total) AS sales
      FROM order_items i JOIN sub_orders s ON s.id = i.sub_order_id JOIN orders o ON o.id = s.order_id
      WHERE o.payment_status::text IN ('PAID', 'PARTIALLY_REFUNDED') AND o.status::text <> 'CANCELLED'
        AND o.placed_at >= ${b.from} AND o.placed_at < ${b.to}
      GROUP BY 1 ORDER BY sales DESC LIMIT 5`;
    const topVendors = await tx.$queryRaw<{ vid: string | null; name: string | null; orders: bigint; sales: bigint }[]>`
      SELECT s.vendor_id::text AS vid, max(v.store_name_ar) AS name, count(DISTINCT s.order_id) AS orders, sum(s.total) AS sales
      FROM sub_orders s JOIN orders o ON o.id = s.order_id LEFT JOIN vendors v ON v.id = s.vendor_id
      WHERE o.payment_status::text IN ('PAID', 'PARTIALLY_REFUNDED') AND o.status::text <> 'CANCELLED'
        AND o.placed_at >= ${b.from} AND o.placed_at < ${b.to}
      GROUP BY 1 ORDER BY sales DESC LIMIT 5`;
    const lowStock = await tx.$queryRaw<{ pid: string; pname: string; vid: string; sku: string; available: number }[]>`
      SELECT p.id::text AS pid, p.name_ar AS pname, v.id::text AS vid, v.sku, (v.stock - v.reserved_stock)::int AS available
      FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE v.is_active AND p.status::text IN ('PUBLISHED', 'PENDING') AND v.stock - v.reserved_stock <= 3
      ORDER BY available, p.name_ar LIMIT 20`;
    const pendingReviewProducts = await tx.product.count({ where: { status: "PENDING" } });
    const isUuid = (s: string | null) => !!s && /^[0-9a-f-]{36}$/i.test(s);
    return adminDashboardDTO.parse({
      period,
      from: b.from.toISOString(),
      to: b.to.toISOString(),
      kpis: {
        sales: { value: cur.sales, previous: prev.sales },
        orders: { value: cur.orders, previous: prev.orders },
        averageOrder: { value: cur.avg, previous: prev.avg },
        newCustomers: { value: cur.customers, previous: prev.customers },
        platformCommission: { value: cur.commission, previous: prev.commission },
      },
      vendorBalances: { pending: bal("PENDING"), available: bal("AVAILABLE") },
      salesChart,
      topProducts: topProducts.map((t) => ({
        productId: isUuid(t.pid) ? t.pid : null,
        name: t.name ?? "",
        qty: num(t.qty),
        sales: num(t.sales),
      })),
      topVendors: topVendors.map((t) => ({
        vendorId: t.vid,
        name: t.name ?? "سوق الزل",
        orders: num(t.orders),
        sales: num(t.sales),
      })),
      pendingReviewProducts,
      lowStock: lowStock.map((l) => ({
        productId: l.pid,
        productName: l.pname,
        variantId: l.vid,
        sku: l.sku,
        available: l.available,
      })),
    });
  });
}

// ================================================================= categories
export async function listAdminCategories(principal: Principal | null): Promise<AdminCategoryDTO[]> {
  const { ctx } = guardSection(principal, "categories");
  return withCtx(ctx, async (tx) => {
    const [cats, all, published] = await Promise.all([
      tx.category.findMany({ orderBy: [{ sort: "asc" }, { nameAr: "asc" }] }),
      tx.product.groupBy({ by: ["categoryId"], where: { status: { not: "ARCHIVED" } }, _count: { _all: true } }),
      tx.product.groupBy({ by: ["categoryId"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    ]);
    const cAll = new Map(all.map((x) => [x.categoryId, x._count._all]));
    const cPub = new Map(published.map((x) => [x.categoryId, x._count._all]));
    const node = (c: (typeof cats)[number]): AdminCategoryDTO => ({
      id: c.id,
      parentId: c.parentId,
      slug: c.slug,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      imageUrl: c.imagePath ? mediaUrl(c.imagePath) : null,
      sort: c.sort,
      isActive: c.isActive,
      showOnHome: c.showOnHome,
      homeSort: c.homeSort,
      vendorsAllowed: c.vendorsAllowed,
      commissionRate: c.commissionRate,
      productCount: cAll.get(c.id) ?? 0,
      publishedCount: cPub.get(c.id) ?? 0,
      children: cats.filter((x) => x.parentId === c.id).map(node),
    });
    return cats.filter((c) => c.parentId === null).map((c) => adminCategoryDTO.parse(node(c)) as AdminCategoryDTO);
  });
}

// ================================================================= orders (read)
function orderSearch(q: string | undefined): Prisma.OrderWhereInput | undefined {
  if (!q) return undefined;
  const phone = normalizeSaudiMobile(q);
  return {
    OR: [
      { number: { contains: q.toUpperCase() } },
      ...(phone ? [{ user: { phone } }] : []),
      { user: { name: { contains: q, mode: "insensitive" as const } } },
    ],
  };
}

const ORDER_ROW_SELECT = {
  id: true,
  number: true,
  placedAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  grandTotal: true,
  addressSnapshot: true,
  user: { select: { id: true, name: true, phone: true } },
  subOrders: { select: { items: { select: { qty: true } } } },
} as const satisfies Prisma.OrderSelect;
type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_ROW_SELECT }>;
const toOrderRow = (o: OrderRow) => ({
  id: o.id,
  number: o.number,
  placedAt: o.placedAt.toISOString(),
  customer: { id: o.user.id, name: o.user.name, phone: o.user.phone },
  status: o.status,
  paymentStatus: o.paymentStatus,
  paymentMethod: o.paymentMethod,
  grandTotal: o.grandTotal,
  itemCount: o.subOrders.reduce((s, so) => s + so.items.reduce((a, i) => a + i.qty, 0), 0),
  subOrderCount: o.subOrders.length,
  city: parseAddressSnapshot(o.addressSnapshot).cityAr || null,
});

export async function listAdminOrders(principal: Principal | null, raw: unknown = {}): Promise<AdminOrderListDTO> {
  const { ctx } = guardSection(principal, "orders");
  const q = adminOrderListInput.parse(raw);
  return withCtx(ctx, async (tx) => {
    const where: Prisma.OrderWhereInput = {
      AND: [
        orderSearch(q.q) ?? {},
        q.status ? { status: q.status } : {},
        q.paymentStatus ? { paymentStatus: q.paymentStatus } : {},
        q.from ? { placedAt: { gte: new Date(q.from) } } : {},
        q.to ? { placedAt: { lt: new Date(q.to) } } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      tx.order.count({ where }),
      tx.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        select: ORDER_ROW_SELECT,
      }),
    ]);
    return adminOrderListDTO.parse({
      items: rows.map(toOrderRow),
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.ceil(total / q.perPage),
    });
  });
}

export async function getAdminOrder(principal: Principal | null, number: string): Promise<AdminOrderDetailDTO> {
  const { ctx } = guardSection(principal, "orders");
  if (!/^SZ-\d{6,}$/.test(number)) throw new NotFoundError();
  return withCtx(ctx, async (tx) => {
    const o = await tx.order.findUnique({
      where: { number },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        payments: { orderBy: { createdAt: "asc" } },
        subOrders: {
          orderBy: { number: "asc" },
          include: {
            vendor: { select: { id: true, storeNameAr: true } },
            items: { orderBy: { createdAt: "asc" } },
            history: { orderBy: { createdAt: "asc" } },
            shipments: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!o) throw new NotFoundError();
    const actorIds = [
      ...new Set(o.subOrders.flatMap((s) => s.history.map((h) => h.byUserId)).filter((x): x is string => !!x)),
    ];
    const actors = actorIds.length
      ? await tx.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, role: true } })
      : [];
    const actorById = new Map(actors.map((a) => [a.id, a]));
    const a = parseAddressSnapshot(o.addressSnapshot);
    return adminOrderDetailDTO.parse({
      id: o.id,
      number: o.number,
      placedAt: o.placedAt.toISOString(),
      paidAt: iso(o.paidAt),
      cancelledAt: iso(o.cancelledAt),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      customer: o.user,
      address: {
        recipientName: a.recipientName,
        recipientPhone: a.recipientPhone,
        city: a.cityAr,
        district: a.district,
        street: a.street,
        buildingNo: a.buildingNo,
        postalCode: a.postalCode,
        nationalAddressShort: a.nationalAddressShort,
      },
      subtotal: o.subtotal,
      discountTotal: o.discountTotal,
      shippingTotal: o.shippingTotal,
      vatTotal: o.vatTotal,
      grandTotal: o.grandTotal,
      couponCode: o.couponCode,
      invoiceType: o.invoiceType,
      subOrders: o.subOrders.map((s) => ({
        id: s.id,
        number: s.number,
        status: s.status,
        vendor: s.vendor ? { id: s.vendor.id, nameAr: s.vendor.storeNameAr } : null,
        lines: s.items.map((i) => {
          const sn = parseItemSnapshot(i.productSnapshot);
          return {
            id: i.id,
            name: sn.nameAr || sn.nameEn,
            optionsLabel: sn.optionsAr,
            sku: sn.sku,
            imageUrl: sn.imagePath ? mediaUrl(sn.imagePath) : null,
            qty: i.qty,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
            vatAmount: i.vatAmount,
          };
        }),
        itemsGross: s.itemsGross,
        platformDiscountShare: s.platformDiscountShare,
        vendorDiscountShare: s.vendorDiscountShare,
        shippingFee: s.shippingFee,
        vatAmount: s.vatAmount,
        total: s.total,
        commissionRate: s.commissionRate,
        commissionAmount: s.commissionAmount,
        vendorPayable: s.vendorPayable,
        shippingMode: s.shippingMode,
        timeline: s.history.map((h) => {
          const by = h.byUserId ? actorById.get(h.byUserId) : undefined;
          return { from: h.from, to: h.to, at: h.createdAt.toISOString(), by: by ?? null, note: h.note };
        }),
        shipments: s.shipments.map((sh) => ({
          id: sh.id,
          direction: sh.direction,
          carrier: sh.carrier,
          trackingNumber: sh.trackingNumber,
          status: sh.status,
          createdAt: sh.createdAt.toISOString(),
        })),
      })),
      payments: o.payments.map((p) => ({
        id: p.id,
        gateway: p.gateway,
        status: p.status,
        amount: p.amount,
        refundedAmount: p.refundedAmount,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  });
}

// ================================================================= customers (read)
const CUSTOMER_SORT = {
  created_desc: Prisma.sql`u.created_at DESC, u.id`,
  orders_desc: Prisma.sql`orders_count DESC, u.created_at DESC, u.id`,
  spent_desc: Prisma.sql`total_spent DESC, u.created_at DESC, u.id`,
} as const;

type CustomerAgg = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "ACTIVE" | "BLOCKED";
  orders_count: bigint;
  total_spent: bigint | null;
  last_order_at: Date | null;
  created_at: Date;
};
const toCustomerRow = (r: CustomerAgg) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email,
  status: r.status,
  ordersCount: num(r.orders_count),
  totalSpent: num(r.total_spent),
  lastOrderAt: iso(r.last_order_at),
  createdAt: r.created_at.toISOString(),
});

function customerFilter(q: string | undefined, status: string | undefined, id?: string) {
  const parts: Prisma.Sql[] = [Prisma.sql`u.role::text = 'CUSTOMER'`, Prisma.sql`u.deleted_at IS NULL`];
  if (id) parts.push(Prisma.sql`u.id = ${id}::uuid`);
  if (status) parts.push(Prisma.sql`u.status::text = ${status}`);
  if (q) {
    const phone = normalizeSaudiMobile(q);
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    parts.push(
      phone
        ? Prisma.sql`(u.phone = ${phone} OR u.name ILIKE ${like})`
        : Prisma.sql`(u.name ILIKE ${like} OR u.email::text ILIKE ${like})`,
    );
  }
  return Prisma.join(parts, " AND ");
}

async function customerRows(tx: Tx, where: Prisma.Sql, order: Prisma.Sql, limit: number, offset: number) {
  return tx.$queryRaw<CustomerAgg[]>`
    SELECT u.id::text AS id, u.name, u.phone, u.email::text AS email, u.status::text AS status, u.created_at,
           count(o.id) AS orders_count,
           coalesce(sum(o.grand_total) FILTER (WHERE o.payment_status::text IN ('PAID', 'PARTIALLY_REFUNDED')), 0) AS total_spent,
           max(o.placed_at) AS last_order_at
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
    WHERE ${where}
    GROUP BY u.id
    ORDER BY ${order}
    LIMIT ${limit} OFFSET ${offset}`;
}

export async function listAdminCustomers(
  principal: Principal | null,
  raw: unknown = {},
): Promise<AdminCustomerListDTO> {
  const { ctx } = guardSection(principal, "customers");
  const q = adminCustomerListInput.parse(raw);
  return withCtx(ctx, async (tx) => {
    const where = customerFilter(q.q, q.status);
    const totalRow = await tx.$queryRaw<{ c: bigint }[]>`SELECT count(*) AS c FROM users u WHERE ${where}`;
    const total = num(totalRow[0]?.c);
    const rows = await customerRows(tx, where, CUSTOMER_SORT[q.sort], q.perPage, (q.page - 1) * q.perPage);
    return adminCustomerListDTO.parse({
      items: rows.map(toCustomerRow),
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.ceil(total / q.perPage),
    });
  });
}

export async function getAdminCustomer(principal: Principal | null, id: string): Promise<AdminCustomerDetailDTO> {
  const { ctx } = guardSection(principal, "customers");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError();
  return withCtx(ctx, async (tx) => {
    const [row] = await customerRows(tx, customerFilter(undefined, undefined, id), CUSTOMER_SORT.created_desc, 1, 0);
    if (!row) throw new NotFoundError();
    const [u, addresses, orders] = await Promise.all([
      tx.user.findUnique({ where: { id }, select: { locale: true, lastLoginAt: true } }),
      tx.address.findMany({
        where: { userId: id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: { city: true },
      }),
      tx.order.findMany({ where: { userId: id }, orderBy: { placedAt: "desc" }, take: 10, select: ORDER_ROW_SELECT }),
    ]);
    return adminCustomerDetailDTO.parse({
      ...toCustomerRow(row),
      locale: u?.locale ?? "ar",
      lastLoginAt: iso(u?.lastLoginAt),
      addresses: addresses.map((a) => ({
        id: a.id,
        label: a.label,
        city: a.city.nameAr,
        district: a.district,
        isDefault: a.isDefault,
      })),
      recentOrders: orders.map(toOrderRow),
    });
  });
}

// ================================================================= settings (view)
const GROUP: Record<string, AdminSettingDTO["group"]> = {
  storeInfo: "store",
  whatsappNumber: "store",
  vatRate: "finance",
  defaultCommission: "finance",
  commissionBase: "finance",
  gatewayFeeBearer: "finance",
  negotiationCommissionBps: "finance",
  platformCouponApprovalBps: "marketing",
  souqDiscountsRequireLicense: "marketing",
  pixels: "marketing",
  holdDays: "payouts",
  newVendorHoldDays: "payouts",
  payoutCycle: "payouts",
  payoutWeekday: "payouts",
  minPayout: "payouts",
  payoutManualReviewOver: "payouts",
  negotiation: "negotiation",
  staffLoginMethod: "security",
  staffTwoFactorEnabled: "security",
  otp: "security",
  captcha: "security",
};

export async function getAdminSettings(principal: Principal | null): Promise<AdminSettingsDTO> {
  const { ctx } = guardSection(principal, "settings");
  return withCtx(ctx, async (tx) => {
    const rows = await tx.setting.findMany({ orderBy: { key: "asc" } });
    const editors = [...new Set(rows.map((r) => r.updatedByUserId).filter((x): x is string => !!x))];
    const users = editors.length
      ? await tx.user.findMany({ where: { id: { in: editors } }, select: { id: true, name: true } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    const seen = new Set(rows.map((r) => r.key));
    const settings: AdminSettingDTO[] = rows.map((r) => ({
      key: r.key,
      group: GROUP[r.key] ?? "other",
      value: r.value,
      isPublic: r.isPublic,
      description: r.description,
      pendingOwner: PENDING_OWNER_KEYS.includes(r.key as SettingKey),
      updatedAt: r.updatedAt.toISOString(),
      updatedBy: r.updatedByUserId ? (byId.get(r.updatedByUserId) ?? null) : null,
    }));
    // keys with no row yet run on their default value: show them too
    for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
      if (seen.has(key)) continue;
      settings.push({
        key,
        group: GROUP[key] ?? "other",
        value: DEFAULT_SETTINGS[key],
        isPublic: false,
        description: null,
        pendingOwner: PENDING_OWNER_KEYS.includes(key),
        updatedAt: null,
        updatedBy: null,
      });
    }
    return adminSettingsDTO.parse({ settings });
  });
}

// ================================================================= staff (SUPER_ADMIN)
export async function listAdminStaff(principal: Principal | null): Promise<AdminStaffListDTO> {
  const { ctx, principal: me } = guardSection(principal, "staff");
  return withCtx(ctx, async (tx) => {
    const rows = await tx.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "STAFF"] }, deletedAt: null },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return adminStaffListDTO.parse({
      staff: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phoneMasked: u.phone ? maskPhone(u.phone) : null,
        role: u.role,
        permissions: u.permissions.filter(isStaffPermission),
        status: u.status,
        lastLoginAt: iso(u.lastLoginAt),
        createdAt: u.createdAt.toISOString(),
        isSelf: u.id === me.userId,
      })),
      allPermissions: [...STAFF_PERMISSIONS],
    });
  });
}

// ================================================================= audit log (SUPER_ADMIN)
export async function listAuditLogs(principal: Principal | null, raw: unknown = {}): Promise<AuditLogListDTO> {
  const { ctx } = guardSection(principal, "audit");
  const q = auditLogListInput.parse(raw);
  return withCtx(ctx, async (tx) => {
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        q.entity ? { entity: q.entity } : {},
        q.action ? { action: { startsWith: q.action } } : {},
        q.actorUserId ? { actorUserId: q.actorUserId } : {},
        q.entityId ? { entityId: q.entityId } : {},
        q.from ? { createdAt: { gte: new Date(q.from) } } : {},
        q.to ? { createdAt: { lt: new Date(q.to) } } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      tx.auditLog.count({ where }),
      tx.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    ]);
    const ids = [...new Set(rows.map((r) => r.actorUserId).filter((x): x is string => !!x))];
    const users = ids.length
      ? await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return auditLogListDTO.parse({
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        actor: r.actorUserId ? (byId.get(r.actorUserId) ?? null) : null,
        actorRole: r.actorRole,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        before: r.before ?? null,
        after: r.after ?? null,
        ip: r.ip,
      })),
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.ceil(total / q.perPage),
    });
  });
}
