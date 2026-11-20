import { beforeAll, describe, expect, it } from "vitest";
import {
  getAdminCapabilities,
  getAdminCustomer,
  getAdminDashboard,
  getAdminOrder,
  getAdminSettings,
  listAdminCategories,
  listAdminCustomers,
  listAdminOrders,
  listAdminStaff,
  listAuditLogs,
} from "@/features/admin/queries";
import { getAdminProduct, listAdminProducts, saveProduct, uploadProductImage } from "@/features/admin/products";
import { productUpsertInput } from "@/features/admin/schema";
import { getProduct } from "@/features/catalog/queries";
import { storageProvider } from "@/lib/providers/storage";
import { withCtx } from "@/lib/db";
import { PermissionDeniedError, UnauthorizedError, type Principal } from "@/lib/permissions";
import { ownerQuery, SYS } from "./helpers";
import { allKeys, seedM1 } from "./m1-setup";

let superAdmin: Principal;
let staff: Principal;
let customers: string[];
const customerPrincipal = (): Principal => ({ kind: "customer", userId: customers[0]!, role: "CUSTOMER" });
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);

beforeAll(async () => {
  ({ superAdmin, staff, customers } = await seedM1());
}, 240_000);

describe("permission matrix (M1-03: STAFF with partial permissions sees only what it may)", () => {
  it("capabilities", async () => {
    const s = await getAdminCapabilities(staff);
    expect(s.role).toBe("STAFF");
    expect(s.permissions.sort()).toEqual(["customers.view", "orders.manage"]);
    expect(s.sections).toEqual({
      dashboard: false,
      products: false,
      categories: false,
      orders: true,
      customers: true,
      coupons: false,
      settings: false,
      staff: false,
      audit: false,
    });
    const a = await getAdminCapabilities(superAdmin);
    expect(Object.values(a.sections).every(Boolean)).toBe(true);
    await expect(getAdminCapabilities(null)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(getAdminCapabilities(customerPrincipal())).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("each service refuses what the principal may not do", async () => {
    const denied: [string, () => Promise<unknown>][] = [
      ["dashboard", () => getAdminDashboard(staff)],
      ["products", () => listAdminProducts(staff)],
      ["product save", () => saveProduct(staff, {})],
      ["upload", () => uploadProductImage(staff, { type: "image/png", size: PNG.length, bytes: PNG })],
      ["categories", () => listAdminCategories(staff)],
      ["settings", () => getAdminSettings(staff)],
      ["staff", () => listAdminStaff(staff)],
      ["audit", () => listAuditLogs(staff)],
      ["customer->orders", () => listAdminOrders(customerPrincipal())],
    ];
    for (const [name, fn] of denied) await expect(fn(), name).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(listAdminOrders(null)).rejects.toBeInstanceOf(UnauthorizedError);
    expect((await listAdminOrders(staff)).total).toBe(7);
    expect((await listAdminCustomers(staff)).total).toBe(3);
  });
});

describe("admin read screens", () => {
  it("dashboard KPIs on the demo orders", async () => {
    const d = await getAdminDashboard(superAdmin, { period: "30d" });
    const paid = await ownerQuery<{ s: number; c: number }>(
      `SELECT coalesce(sum(grand_total), 0)::int AS s, count(*)::int AS c FROM orders
       WHERE payment_status::text IN ('PAID', 'PARTIALLY_REFUNDED') AND status::text <> 'CANCELLED'`,
    );
    expect(d.kpis.sales.value).toBe(paid.rows[0]!.s);
    expect(d.kpis.orders.value).toBe(5); // 7 demo orders - pending payment - cancelled
    expect(d.kpis.averageOrder.value).toBe(Math.round(paid.rows[0]!.s / 5));
    expect(d.kpis.newCustomers.value).toBe(3);
    expect(d.kpis.platformCommission.value).toBe(0); // platform products carry no commission (6.1)
    expect(d.salesChart.length).toBeGreaterThanOrEqual(30);
    expect(d.salesChart.reduce((s, p) => s + p.sales, 0)).toBe(paid.rows[0]!.s);
    expect(d.topVendors[0]!).toMatchObject({ vendorId: null, name: "سوق الزل" });
    expect(d.lowStock.length).toBeGreaterThan(0);
    const today = await getAdminDashboard(superAdmin, { period: "today" });
    expect(today.kpis.orders.value).toBeLessThanOrEqual(d.kpis.orders.value);
  });

  it("orders list/detail and customers list/detail", async () => {
    const list = await listAdminOrders(staff, { status: "SHIPPED" });
    expect(list.total).toBe(1);
    const byPhone = await listAdminOrders(staff, { q: "0500000001" });
    expect(byPhone.total).toBe(3);
    const d = await getAdminOrder(staff, list.items[0]!.number);
    expect(d.subOrders[0]!.timeline.at(-1)!.to).toBe("SHIPPED");
    expect(d.subOrders[0]!.vendor).toBeNull();
    expect(d.payments[0]!.status).toBe("PAID");
    const cs = await listAdminCustomers(staff, { sort: "spent_desc" });
    expect(cs.items[0]!.totalSpent).toBeGreaterThanOrEqual(cs.items[1]!.totalSpent);
    const c = await getAdminCustomer(staff, customers[0]!);
    expect(c.ordersCount).toBe(3);
    expect(c.recentOrders).toHaveLength(3);
    expect(c.addresses).toHaveLength(1);
    // customer phones are masked on the SERVER (no raw +9665… in any admin DTO)
    const raw = /\+9665\d{8}/;
    expect(JSON.stringify([list, byPhone, d, cs, c])).not.toMatch(raw);
    expect(d.customer.phone).toMatch(/^\+9665\*{6}\d{2}$/);
    expect(d.address.recipientPhone).toMatch(/^\+9665\*{6}\d{2}$/);
  });

  it("categories tree, settings view, staff and audit (SUPER_ADMIN)", async () => {
    const cats = await listAdminCategories(superAdmin);
    expect(cats).toHaveLength(14);
    expect(cats.find((c) => c.slug === "luxury-swords")!.vendorsAllowed).toBe(false);
    expect(cats.find((c) => c.slug === "bisht")!.publishedCount).toBe(3);
    const settings = await getAdminSettings(superAdmin);
    expect(settings.settings.find((s) => s.key === "vatRate")).toMatchObject({
      value: 1500,
      group: "finance",
      pendingOwner: false,
    });
    expect(settings.settings.find((s) => s.key === "holdDays")!.pendingOwner).toBe(true);
    const st = await listAdminStaff(superAdmin);
    expect(st.staff.map((x) => x.role).sort()).toEqual(["STAFF", "SUPER_ADMIN"]);
    expect(st.staff.find((x) => x.role === "SUPER_ADMIN")!.isSelf).toBe(true);
    expect(allKeys(st).has("passwordHash")).toBe(false);
  });
});

describe("admin products (create/edit with variants and images, audited)", () => {
  let catId: string;
  beforeAll(async () => {
    catId = (await ownerQuery<{ id: string }>("SELECT id FROM categories WHERE slug = 'shawls'")).rows[0]!.id;
  });

  it("validates the upsert input (one value per option, unique combos/SKUs, compare-at > price)", () => {
    const base = {
      nameAr: "شال",
      nameEn: "Shawl",
      categoryId: catId,
      options: [{ nameAr: "اللون", nameEn: "Color", values: [{ key: "a", valueAr: "أ", valueEn: "A" }] }],
    };
    expect(
      productUpsertInput.safeParse({ ...base, variants: [{ sku: "X-1", optionValueKeys: [], price: 100, stock: 1 }] })
        .success,
    ).toBe(false);
    expect(
      productUpsertInput.safeParse({
        ...base,
        variants: [
          { sku: "X-1", optionValueKeys: ["a"], price: 100, stock: 1 },
          { sku: "X-2", optionValueKeys: ["a"], price: 100, stock: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(
      productUpsertInput.safeParse({
        ...base,
        variants: [{ sku: "X-1", optionValueKeys: ["a"], price: 100, compareAtPrice: 90, stock: 1 }],
      }).success,
    ).toBe(false);
    expect(
      productUpsertInput.safeParse({
        ...base,
        vendorId: crypto.randomUUID(),
        variants: [{ sku: "X-1", optionValueKeys: ["a"], price: 100, stock: 1 }],
      }).success,
    ).toBe(false);
  });

  it("upload -> create -> edit (variant ids kept, dropped variants deactivated) -> visible in the store; audit_logs", async () => {
    const up = await uploadProductImage(superAdmin, { type: "image/png", size: PNG.length, bytes: PNG });
    expect(up.path).toMatch(/^products\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/);
    expect(await storageProvider().headObject({ bucket: "public", key: up.path })).not.toBeNull();
    await expect(
      uploadProductImage(superAdmin, { type: "image/png", size: 5, bytes: new TextEncoder().encode("<svg>") }),
    ).rejects.toMatchObject({
      message: "UPLOAD_REJECTED_TYPE",
    });
    await expect(
      uploadProductImage(superAdmin, { type: "image/svg+xml", size: PNG.length, bytes: PNG }),
    ).rejects.toMatchObject({
      message: "UPLOAD_REJECTED_TYPE",
    });

    const input = {
      nameAr: "شال إداري",
      nameEn: "Admin shawl",
      categoryId: catId,
      status: "PUBLISHED" as const,
      descriptionAr: "سطر أول\n<script>x</script>سطر\n\n\nفقرة ثانية",
      options: [
        {
          nameAr: "اللون",
          nameEn: "Color",
          values: [
            { key: "red", valueAr: "أحمر", valueEn: "Red" },
            { key: "blue", valueAr: "أزرق", valueEn: "Blue" },
          ],
        },
      ],
      variants: [
        { sku: "adm-shawl-red", optionValueKeys: ["red"], price: 30_000, compareAtPrice: 35_000, stock: 4 },
        { sku: "ADM-SHAWL-BLUE", optionValueKeys: ["blue"], price: 25_000, stock: 2 },
      ],
      images: [{ path: up.path, alt: "صورة" }],
    };
    const created = await saveProduct(superAdmin, input, { meta: { ip: "203.0.113.5" } });
    expect(created.slug).toBe("admin-shawl");
    const detail = await getAdminProduct(superAdmin, created.id);
    expect(detail.descriptionAr).toBe("سطر أول\nx سطر\n\nفقرة ثانية");
    expect(detail.variants.map((v) => v.sku).sort()).toEqual(["ADM-SHAWL-BLUE", "ADM-SHAWL-RED"]);
    const store = await getProduct("admin-shawl");
    expect(store.price).toBe(25_000);
    expect(store.priceFrom).toBe(true);
    expect(store.images[0]!.url).toContain(up.path);

    // edit: keep the red variant (by id), drop blue, add green; rename option values
    const red = detail.variants.find((v) => v.sku === "ADM-SHAWL-RED")!;
    const opt = detail.options[0]!;
    const redKey = opt.values.find((v) => v.valueAr === "أحمر")!.key;
    await saveProduct(
      superAdmin,
      {
        ...input,
        slug: "admin-shawl",
        options: [
          {
            nameAr: "اللون",
            nameEn: "Color",
            values: [
              { key: redKey, valueAr: "أحمر داكن", valueEn: "Dark red" },
              { key: "g", valueAr: "أخضر", valueEn: "Green" },
            ],
          },
        ],
        variants: [
          { id: red.id, sku: "ADM-SHAWL-RED", optionValueKeys: [redKey], price: 31_000, stock: 6 },
          { sku: "ADM-SHAWL-GREEN", optionValueKeys: ["g"], price: 33_000, stock: 1 },
        ],
      },
      { id: created.id },
    );
    const after = await getAdminProduct(superAdmin, created.id);
    expect(after.variants.find((v) => v.id === red.id)).toMatchObject({ price: 31_000, stock: 6, isActive: true });
    expect(after.variants.find((v) => v.sku === "ADM-SHAWL-BLUE")!.isActive).toBe(false);
    const store2 = await getProduct("admin-shawl");
    expect(store2.variants).toHaveLength(2);
    expect(store2.options[0]!.values.map((v) => v.value)).toEqual(["أحمر داكن", "أخضر"]);
    expect(store2.price).toBe(31_000);

    const logs = await listAuditLogs(superAdmin, { entity: "Product", entityId: created.id });
    expect(logs.items.map((l) => l.action)).toEqual(["product.update", "product.create"]);
    expect(logs.items[1]!.ip).toBe("203.0.113.5");
    expect(logs.items[0]!.actor?.id).toBe(superAdmin.userId);

    // admin list
    const list = await listAdminProducts(superAdmin, { q: "adm-shawl" });
    expect(list.items.map((i) => i.id)).toEqual([created.id]);
    expect(list.items[0]).toMatchObject({
      editable: true,
      available: 7,
      variantCount: 3,
      priceMin: 31_000,
      priceMax: 33_000,
    });
    const byStock = await listAdminProducts(superAdmin, { sort: "stock_asc", perPage: 5 });
    expect(byStock.items[0]!.available).toBeLessThanOrEqual(byStock.items[1]!.available);
    expect((await listAdminProducts(superAdmin, { vendor: "platform" })).total).toBe(43);
  });

  it("errors: SLUG_TAKEN, SKU_TAKEN, unknown category, foreign variant id, missing upload, vendor product read-only", async () => {
    const v = (sku: string) => [{ sku, optionValueKeys: [], price: 10_000, stock: 1 }];
    const base = { nameAr: "منتج", nameEn: "Item", categoryId: catId };
    await expect(
      saveProduct(superAdmin, { ...base, slug: "demo-bisht-classic", variants: v("NEW-A") }),
    ).rejects.toMatchObject({ code: "SLUG_TAKEN" });
    await expect(saveProduct(superAdmin, { ...base, variants: v("DEMO-BISHT-CLASSIC-11") })).rejects.toMatchObject({
      code: "SKU_TAKEN",
    });
    await expect(
      saveProduct(superAdmin, { ...base, categoryId: crypto.randomUUID(), variants: v("NEW-B") }),
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
    const other = await getAdminProduct(
      superAdmin,
      (await listAdminProducts(superAdmin, { q: "demo-iqal-mirir" })).items[0]!.id,
    );
    const mine = (await saveProduct(superAdmin, { ...base, variants: v("NEW-C") })).id;
    await expect(
      saveProduct(superAdmin, { ...base, variants: [{ ...v("NEW-C")[0]!, id: other.variants[0]!.id }] }, { id: mine }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      saveProduct(superAdmin, {
        ...base,
        variants: v("NEW-D"),
        images: [{ path: "products/2026-11/00000000-0000-4000-8000-000000000000.png" }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    // generated slugs never collide
    const again = await saveProduct(superAdmin, { ...base, variants: v("NEW-E") });
    expect(again.slug).toBe("item-2");

    const vendorProduct = await withCtx(SYS, async (tx) => {
      const owner = await tx.user.create({ data: { name: "مالك", phone: "+966500000098", role: "VENDOR_OWNER" } });
      const vendor = await tx.vendor.create({
        data: {
          ownerUserId: owner.id,
          storeNameAr: "م",
          storeNameEn: "S",
          slug: "ro-store",
          legalName: "x",
          status: "APPROVED",
        },
      });
      return (
        await tx.product.create({
          data: { vendorId: vendor.id, categoryId: catId, nameAr: "م", nameEn: "V", slug: "vendor-p", basePrice: 100 },
        })
      ).id;
    });
    expect((await listAdminProducts(superAdmin, { q: "vendor-p" })).items[0]!.editable).toBe(false);
    await expect(
      saveProduct(superAdmin, { ...base, variants: v("NEW-F") }, { id: vendorProduct }),
    ).rejects.toMatchObject({
      code: "VENDOR_PRODUCT_READ_ONLY",
    });
  });
});
