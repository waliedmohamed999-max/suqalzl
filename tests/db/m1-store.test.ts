import { beforeAll, describe, expect, it } from "vitest";
import {
  getBundle,
  getHome,
  getProduct,
  listCategories,
  listProducts,
  searchProducts,
  searchSuggest,
} from "@/features/catalog/queries";
import {
  addToCart,
  getCart,
  mergeGuestCart,
  quoteShipping,
  removeCartLine,
  saveAddress,
  updateCartLine,
  listAddresses,
  getCheckoutAddressStep,
  deleteAddress,
} from "@/features/cart/service";
import { getMyOrder, listMyOrders } from "@/features/orders/queries";
import { getPage, listPages } from "@/features/pages/queries";
import { saveProduct } from "@/features/admin/products";
import { NotFoundError, withCtx } from "@/lib/db";
import type { Principal } from "@/lib/permissions";
import { ownerQuery, SYS } from "./helpers";

const FLOOR_A = 987_653; // distinctive value searched for in the responses
import { allKeys, FORBIDDEN_PUBLIC_KEYS, seedM1 } from "./m1-setup";

let superAdmin: Principal;
let customers: string[];
let output: string[];

beforeAll(async () => {
  ({ superAdmin, customers, output } = await seedM1());
}, 240_000);

describe("M1-01 demo seed", () => {
  it("is idempotent and labelled as demo data", async () => {
    expect(output[0]).toMatch(
      /seed demo: \+42 products, \+2 bundles, \+2 banners, \+6 home sections, \+5 pages, \+3 customers, \+7 orders, staff created/,
    );
    expect(output[1]).toMatch(
      /seed demo: \+0 products, \+0 bundles, \+0 banners, \+0 home sections, \+0 pages, \+0 customers, \+0 orders, staff exists/,
    );
    const p = await ownerQuery<{ n: number; demo: number; platform: number; cats: number }>(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE name_ar LIKE '%(توضيحي)%' AND name_en LIKE '%(Demo)%')::int AS demo,
              count(*) FILTER (WHERE vendor_id IS NULL)::int AS platform, count(DISTINCT category_id)::int AS cats FROM products`,
    );
    expect(p.rows[0]).toEqual({ n: 42, demo: 42, platform: 42, cats: 14 });
    const statuses = await ownerQuery<{ status: string }>("SELECT DISTINCT status::text AS status FROM sub_orders");
    expect(statuses.rows.map((r) => r.status).sort()).toEqual(
      ["CANCELLED", "COMPLETED", "DELIVERED", "NEW", "PENDING_PAYMENT", "PREPARING", "SHIPPED"].sort(),
    );
    // no real personal data: reserved phone block + .invalid e-mail
    const people = await ownerQuery<{ phone: string | null; email: string | null }>(
      "SELECT phone, email::text AS email FROM users WHERE role::text IN ('CUSTOMER', 'STAFF')",
    );
    for (const u of people.rows) {
      if (u.phone) expect(u.phone).toMatch(/^\+96650000000\d$/);
      if (u.email) expect(u.email).toMatch(/\.invalid$/);
    }
  });

  it("refuses to run in production", async () => {
    const { assertDemoAllowed } = await import("../../prisma/seed-demo");
    expect(() => assertDemoAllowed({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(
      /not allowed in production/,
    );
    expect(() => assertDemoAllowed({ APP_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toThrow();
  });
});

describe("catalogue (M1-02 / P2-01)", () => {
  it("home renders every configured section from HomeSection", async () => {
    const home = await getHome("ar");
    expect(home.sections.map((s) => s.type)).toEqual([
      "BANNERS",
      "CATEGORIES",
      "FEATURED",
      "CATEGORY_PRODUCTS",
      "BUNDLES",
      "CATEGORY_PRODUCTS",
    ]);
    const cats = home.sections.find((s) => s.type === "CATEGORIES");
    expect(cats && cats.type === "CATEGORIES" && cats.categories.length).toBe(8);
    const en = await getHome("en");
    const featured = en.sections.find((s) => s.type === "FEATURED");
    expect(featured?.type === "FEATURED" && featured.products.every((p) => p.name.endsWith("(Demo)"))).toBe(true);
  });

  it("categories list counts public products", async () => {
    const cats = await listCategories("ar");
    expect(cats).toHaveLength(14);
    expect(cats.find((c) => c.slug === "bisht")!.productCount).toBe(3);
  });

  it("product list: category, sort, price/onSale/vendor filters, pages and facets", async () => {
    const bisht = await listProducts({ category: "bisht", sort: "price_asc" });
    expect(bisht.total).toBe(3);
    expect(bisht.items.map((i) => i.price)).toEqual([...bisht.items.map((i) => i.price)].sort((a, b) => a - b));
    expect(bisht.category?.breadcrumbs).toEqual([{ slug: "bisht", name: "بشوت" }]);
    expect(bisht.facets.vendors).toEqual([{ slug: "souq", name: "سوق الزل", count: 3 }]);
    const all = await listProducts({ perPage: 10, page: 2 });
    expect(all.total).toBe(42);
    expect(all.items).toHaveLength(10);
    expect(all.totalPages).toBe(5);
    const cheap = await listProducts({ priceMax: 10_000 });
    expect(cheap.items.every((i) => i.price <= 10_000)).toBe(true);
    expect(cheap.total).toBeGreaterThan(0);
    const sale = await listProducts({ onSale: true });
    expect(sale.items.every((i) => i.compareAtPrice !== null)).toBe(true);
    const inStock = await listProducts({ inStock: true });
    expect(inStock.items.find((i) => i.slug === "demo-mabkhara-wood")).toBeUndefined();
    await expect(listProducts({ category: "nope" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("product page: options, variants, stock levels, platform vendor = null", async () => {
    const p = await getProduct("demo-bisht-classic", "ar");
    expect(p.options.map((o) => o.name)).toEqual(["اللون", "المقاس"]);
    expect(p.variants).toHaveLength(12);
    expect(p.variants.every((v) => v.optionValueIds.length === 2)).toBe(true);
    expect(p.variants.some((v) => v.stockLevel === "OUT" && v.maxQty === 0)).toBe(true);
    expect(p.variants.find((v) => v.id === p.defaultVariantId)!.maxQty).toBeGreaterThan(0);
    expect(p.vendor).toBeNull();
    expect(p.related.length).toBeGreaterThan(0);
    expect(p.images[0]!.url).toMatch(/^\/media\/demo\/products\/demo-bisht-classic-1\.svg$/);
    await expect(getProduct("does-not-exist")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("bundle page", async () => {
    const b = await getBundle("demo-bundle-groom", "ar");
    expect(b.items).toHaveLength(3);
    expect(b.inStock).toBe(true);
    expect(b.itemsValue).toBeGreaterThan(b.price);
  });

  it("Arabic-normalised search (أ/إ/آ، ة/ه، ى/ي، tashkeel, ال)", async () => {
    const a = await searchProducts({ q: "البشت" });
    expect(a.total).toBe(3);
    expect((await searchProducts({ q: "بِشْت" })).total).toBe(3);
    const abaya = await searchProducts({ q: "عبايه مطرزه" });
    expect(abaya.items.map((i) => i.slug)).toEqual(["demo-abaya-embroidered"]);
    expect((await searchProducts({ q: "كحلي" })).total).toBe(0); // option values are not indexed
    expect((await searchProducts({ q: "اسود" })).items.map((i) => i.slug)).toEqual(["demo-iqal-black"]); // "أسود"
    expect((await searchProducts({ q: "saffron", locale: "en" })).items[0]!.name).toMatch(/saffron/i);
    expect((await searchProducts({ q: "!!!" })).total).toBe(0);
    const s = await searchSuggest({ q: "زعف" });
    expect(s.products.length).toBeGreaterThan(0);
    expect(s.categories.map((c) => c.slug)).toContain("super-saffron");
  });

  it("an admin-created product appears in the store only once published (M1-03 acceptance)", async () => {
    const cat = await ownerQuery<{ id: string }>("SELECT id FROM categories WHERE slug = 'oud-oils'");
    const draft = await saveProduct(superAdmin, {
      nameAr: "دهن عود جديد",
      nameEn: "New oud oil",
      categoryId: cat.rows[0]!.id,
      status: "DRAFT",
      variants: [{ sku: "NEW-OUD-1", optionValueKeys: [], price: 77_700, stock: 5 }],
    });
    await expect(getProduct(draft.slug)).rejects.toBeInstanceOf(NotFoundError);
    expect((await searchProducts({ q: "عود جديد" })).total).toBe(0);
    await saveProduct(
      superAdmin,
      {
        nameAr: "دهن عود جديد",
        nameEn: "New oud oil",
        slug: draft.slug,
        categoryId: cat.rows[0]!.id,
        status: "PUBLISHED",
        variants: [{ sku: "NEW-OUD-1", optionValueKeys: [], price: 77_700, stock: 5 }],
      },
      { id: draft.id },
    );
    const p = await getProduct(draft.slug);
    expect(p.price).toBe(77_700);
    expect((await searchProducts({ q: "عود جديد" })).items.map((i) => i.slug)).toContain(draft.slug);
    expect((await listProducts({ category: "oud-oils" })).total).toBe(4);
  });
});

describe("cart + address step (M1-02 / P2-02)", () => {
  it("guest cart: token cookie, stock caps, update/remove, unavailable lines, merge after login", async () => {
    const p = await getProduct("demo-iqal-kids"); // stock 2
    const v = p.variants[0]!;
    const guest0 = { kind: "guest" as const, token: null };
    const r = await addToCart(guest0, { variantId: v.id, qty: 1 });
    expect(r.newGuestToken).toBeTruthy();
    const guest = { kind: "guest" as const, token: r.newGuestToken };
    expect((await getCart(guest)).itemCount).toBe(1);
    expect((await getCart(guest0)).itemCount).toBe(0);
    expect((await getCart({ kind: "guest", token: "x".repeat(40) })).itemCount).toBe(0);
    await expect(addToCart(guest, { variantId: v.id, qty: 5 })).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    const two = await addToCart(guest, { variantId: v.id, qty: 1 });
    expect(two.newGuestToken).toBeNull();
    expect(two.cart.lines[0]!.qty).toBe(2);
    expect(two.cart.subtotal).toBe(2 * v.price);
    expect(two.cart.vatIncluded).toBe(Math.round((2 * v.price * 15) / 115));
    const bundle = await getBundle("demo-bundle-majlis");
    const withBundle = await addToCart(guest, { bundleId: bundle.id, qty: 1 });
    expect(withBundle.cart.lines.map((l) => l.kind)).toEqual(["VARIANT", "BUNDLE"]);
    await removeCartLine(guest, { lineId: withBundle.cart.lines[1]!.id });
    // an out-of-stock product cannot be added
    const wood = await getProduct("demo-mabkhara-wood");
    await expect(addToCart(guest, { variantId: wood.variants[0]!.id })).rejects.toMatchObject({ code: "OUT_OF_STOCK" });

    // unpublishing keeps the line, marked unavailable and out of the totals
    const other = await getProduct("demo-misbaha-wood");
    await addToCart(guest, { variantId: other.variants[0]!.id, qty: 3 });
    await withCtx(SYS, (tx) => tx.product.update({ where: { id: other.id }, data: { status: "ARCHIVED" } }));
    const after = await getCart(guest);
    const line = after.lines.find((l) => l.slug === "demo-misbaha-wood")!;
    expect(line).toMatchObject({ available: false, maxQty: 0 });
    expect(after.subtotal).toBe(2 * v.price);
    expect(after.hasIssues).toBe(true);
    await withCtx(SYS, (tx) => tx.product.update({ where: { id: other.id }, data: { status: "PUBLISHED" } }));

    // another guest cannot touch this line
    await expect(
      updateCartLine({ kind: "guest", token: "y".repeat(43) }, { lineId: line.id, qty: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);

    // login: merge into the customer's cart, guest cart deleted
    const user = { kind: "user" as const, userId: customers[2]! };
    await addToCart(user, { variantId: v.id, qty: 1 });
    expect(await mergeGuestCart(customers[2]!, r.newGuestToken)).toBe(2);
    const merged = await getCart(user);
    expect(merged.lines.find((l) => l.variantId === v.id)!.qty).toBe(3); // 1 + 2, above stock 2 -> flagged
    expect(merged.lines.find((l) => l.variantId === v.id)!.qtyExceedsStock).toBe(true);
    expect((await getCart(guest)).itemCount).toBe(0);
    expect(await mergeGuestCart(customers[2]!, r.newGuestToken)).toBe(0);
    // another customer does not see it
    expect((await getCart({ kind: "user", userId: customers[1]! })).lines).toHaveLength(0);
  });

  it("addresses and shipping quote per store (demo zone)", async () => {
    const userId = customers[2]!;
    const step = await getCheckoutAddressStep(userId);
    expect(step.addresses).toHaveLength(1);
    expect(step.cities.length).toBe(24);
    const riyadh = step.cities.find((c) => c.slug === "riyadh")!;
    const a = await saveAddress(userId, {
      recipientName: "مستلم توضيحي",
      recipientPhone: "0500000009",
      cityId: riyadh.id,
      district: "حي",
      street: "شارع",
      isDefault: true,
    });
    expect(a.recipientPhone).toBe("+966500000009");
    const list = await listAddresses(userId);
    expect(list.filter((x) => x.isDefault).map((x) => x.id)).toEqual([a.id]);
    await expect(
      saveAddress(userId, {
        ...{ recipientName: "x", recipientPhone: "123456789", cityId: riyadh.id, district: "d", street: "s" },
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
    });
    // someone else's address: not found
    await expect(
      saveAddress(customers[0]!, {
        id: a.id,
        recipientName: "x",
        recipientPhone: "0500000009",
        cityId: riyadh.id,
        district: "d",
        street: "s",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(quoteShipping(customers[0]!, { addressId: a.id })).rejects.toBeInstanceOf(NotFoundError);

    const q = await quoteShipping(userId, { addressId: a.id });
    expect(q.shipments).toHaveLength(1);
    expect(q.shipments[0]!.vendor).toBeNull();
    const expectedFee = q.subtotal >= 50_000 ? 0 : 3_000;
    expect(q.shippingTotal).toBe(expectedFee);
    expect(q.grandTotal).toBe(q.subtotal + expectedFee);
    expect(q.paymentAvailable).toBe(false);
    await deleteAddress(userId, a.id);
    await expect(deleteAddress(userId, a.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("customer orders (M1-02 / P2-04)", () => {
  it("lists and shows only the customer's own orders", async () => {
    const mine = await listMyOrders(customers[0]!);
    expect(mine.total).toBe(3);
    const shipped = mine.items.find((o) => o.status === "SHIPPED")!;
    const d = await getMyOrder(customers[0]!, { number: shipped.number });
    expect(d.subOrders[0]!.timeline.map((t) => t.status)).toEqual([
      "PENDING_PAYMENT",
      "NEW",
      "PREPARING",
      "READY_TO_SHIP",
      "SHIPPED",
    ]);
    expect(d.subOrders[0]!.shipments[0]!.trackingNumber).toMatch(/^DEMO/);
    expect(d.subOrders[0]!.lines[0]!.productSlug).toBe("demo-oud-oil");
    expect(d.grandTotal).toBe(d.subtotal + d.shippingTotal - d.discountTotal);
    await expect(getMyOrder(customers[1]!, { number: shipped.number })).rejects.toBeInstanceOf(NotFoundError);
    expect((await listMyOrders(customers[1]!)).items.map((o) => o.number)).not.toContain(shipped.number);
  });
});

describe("policy pages (P2-05 display)", () => {
  it("serves the v0.2 drafts with the preview note; English falls back to Arabic", async () => {
    const p = await getPage("privacy", "ar");
    expect(p.content).toMatch(/مسودة/);
    expect(p.format).toBe("markdown");
    const en = await getPage("returns", "en");
    expect(en.fallbackLocale).toBe(true);
    expect((await listPages("en")).map((x) => x.slug).sort()).toEqual([
      "privacy",
      "returns",
      "shipping",
      "terms",
      "vendor-agreement",
    ]);
    await expect(getPage("nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("leak test: public DTOs (D36-6)", () => {
  it("no store legal/bank data, negotiation secrets, password hashes or stock internals in any public response", async () => {
    // a store with every sensitive column filled, and a published product with negotiation floors
    const secret = await withCtx(SYS, async (tx) => {
      const owner = await tx.user.create({
        data: { name: "مالك", phone: "+966500000099", role: "VENDOR_OWNER", passwordHash: "scrypt$SECRET-HASH" },
      });
      const vendor = await tx.vendor.create({
        data: {
          ownerUserId: owner.id,
          storeNameAr: "متجر الاختبار",
          storeNameEn: "Leak test store",
          slug: "leak-store",
          legalName: "LEGAL-NAME-SECRET",
          crNumber: "CR-SECRET-1",
          vatNumber: "300000000000003",
          iban: "v1:iv:tag:IBAN-CIPHER-SECRET",
          ibanLast4: "7519",
          bankName: "BANK-SECRET",
          accountHolderName: "HOLDER-SECRET",
          pickupAddress: { street: "PICKUP-SECRET" },
          status: "APPROVED",
          commissionRate: 1234,
        },
      });
      const cat = await tx.category.findUniqueOrThrow({ where: { slug: "bisht" } });
      const prod = await tx.product.create({
        data: {
          vendorId: vendor.id,
          categoryId: cat.id,
          nameAr: "بشت متجر",
          nameEn: "Store bisht",
          slug: "leak-bisht",
          status: "PUBLISHED",
          basePrice: 200_000,
          publishedAt: new Date(),
        },
      });
      const v = await tx.productVariant.create({
        data: { productId: prod.id, sku: "LEAK-1", price: 200_000, stock: 4 },
      });
      await tx.variantNegotiationSettings.create({
        data: { variantId: v.id, floorPrice: FLOOR_A, autoAcceptPrice: FLOOR_A + 1 },
      });
      return { variantId: v.id };
    });
    const guest = await addToCart({ kind: "guest", token: null }, { variantId: secret.variantId, qty: 1 });
    const responses = [
      await getHome("ar"),
      await listProducts({ category: "bisht" }),
      await getProduct("leak-bisht"),
      await searchProducts({ q: "بشت" }),
      await searchSuggest({ q: "بشت" }),
      await getBundle("demo-bundle-groom"),
      guest.cart,
      await getCart({ kind: "guest", token: guest.newGuestToken }),
      await listMyOrders(customers[0]!),
      await getMyOrder(customers[0]!, { number: (await listMyOrders(customers[0]!)).items[0]!.number }),
      await getCheckoutAddressStep(customers[0]!),
      await getPage("terms"),
    ];
    const product = await getProduct("leak-bisht");
    expect(product.vendor).toMatchObject({ slug: "leak-store", storeNameEn: "Leak test store" });
    for (const r of responses) {
      const keys = allKeys(r);
      for (const k of FORBIDDEN_PUBLIC_KEYS) expect(keys.has(k), `key ${k}`).toBe(false);
      const json = JSON.stringify(r);
      for (const needle of ["SECRET", String(FLOOR_A), String(FLOOR_A + 1), "300000000000003"])
        expect(json.includes(needle), needle).toBe(false);
    }
  });
});
