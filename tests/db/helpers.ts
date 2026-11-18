import { randomInt } from "node:crypto";
import pg from "pg";
import { withCtx } from "@/lib/db";

export const FLOOR_A = 150_000; // 1,500.00 SAR — distinctive values, searched for in leak tests
export const AUTO_A = 190_000;
export const FLOOR_B = 140_000;
export const AUTO_B = 185_000;

const ALL_TABLES = `realtime_events, moderation_flags, price_locks, price_offers, negotiation_threads,
  price_request_recipients, price_requests, variant_negotiation_settings, negotiation_settings,
  deal_redemptions, deal_variants, deals, price_history, vendor_purchase_invoices, wallet_transactions,
  payouts, payout_batches, shipment_events, shipments, shipping_zone_cities, shipping_zones,
  tax_invoice_lines, tax_invoices, reviews, returns, webhook_events, payment_transactions, payments,
  order_status_history, order_items, sub_orders, orders, cart_items, carts, coupons, addresses,
  wishlists, stock_reservations, bundle_items, bundles, product_variants, option_values,
  product_options, product_images, product_revisions, products, jobs, home_sections, banners, pages,
  redirects, notifications, audit_logs, settings, vendor_bank_change_requests, vendor_categories,
  vendor_members, vendor_documents, vendors, categories, cities, marketing_consents,
  rate_limit_buckets, trusted_devices, otp_challenges, sessions, users`;

/** Owner connection (TRUNCATE is not granted to the app role). */
export async function truncateAll() {
  const c = new pg.Client({ connectionString: process.env.DIRECT_URL });
  await c.connect();
  try {
    await c.query(`TRUNCATE ${ALL_TABLES} RESTART IDENTITY CASCADE`);
  } finally {
    await c.end();
  }
}

/**
 * Raw SQL as the table OWNER in a `system` context. FORCE RLS applies to the owner too, so even
 * test fixtures need a context (that is the point of FORCE).
 */
export async function ownerQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: process.env.DIRECT_URL });
  await c.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.role', 'system', true)");
    const r = await c.query<T>(sql, params);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

export const randomPhone = () => `+9665${String(randomInt(0, 99_999_999)).padStart(8, "0")}`;
const rnd = () => randomInt(1e9);

export interface Seed {
  customer1: string;
  customer2: string;
  ownerA: string;
  ownerB: string;
  ownerC: string;
  vendorA: string;
  vendorB: string;
  vendorC: string;
  catBisht: string;
  catOud: string;
  city: string;
  productA: string; // published, vendor A, bisht
  productADraft: string;
  productB: string; // published, vendor B, bisht
  productBDraft: string;
  productC: string; // published, vendor C, oud
  variantA: string;
  variantB: string;
  variantBDraft: string;
  variantC: string;
}

/** Seeds through the runtime role in a 'system' context (same path as prisma/seed.ts). */
export async function seedFixture(): Promise<Seed> {
  return withCtx({ kind: "system", reason: "test.seed" }, async (tx) => {
    const u = async (name: string, role: "CUSTOMER" | "VENDOR_OWNER") =>
      (await tx.user.create({ data: { name, phone: randomPhone(), phoneVerifiedAt: new Date(), role } })).id;
    const customer1 = await u("عميل 1", "CUSTOMER");
    const customer2 = await u("عميل 2", "CUSTOMER");
    const ownerA = await u("مالك أ", "VENDOR_OWNER");
    const ownerB = await u("مالك ب", "VENDOR_OWNER");
    const ownerC = await u("مالك ج", "VENDOR_OWNER");
    const catBisht = (await tx.category.create({ data: { nameAr: "بشوت", nameEn: "Bisht", slug: `bisht-${rnd()}` } }))
      .id;
    const catOud = (await tx.category.create({ data: { nameAr: "عود", nameEn: "Oud", slug: `oud-${rnd()}` } })).id;
    const city = (await tx.city.create({ data: { nameAr: "الرياض", nameEn: "Riyadh", slug: `riyadh-${rnd()}` } })).id;
    const v = async (owner: string, name: string, cat: string) => {
      const id = (
        await tx.vendor.create({
          data: {
            ownerUserId: owner,
            storeNameAr: name,
            storeNameEn: name,
            slug: `store-${rnd()}`,
            legalName: name,
            status: "APPROVED",
            ibanLast4: "7519",
          },
        })
      ).id;
      await tx.vendorCategory.create({ data: { vendorId: id, categoryId: cat } });
      return id;
    };
    const vendorA = await v(ownerA, "متجر أ", catBisht);
    const vendorB = await v(ownerB, "متجر ب", catBisht);
    const vendorC = await v(ownerC, "متجر ج", catOud);
    const p = async (vendorId: string | null, categoryId: string, status: "PUBLISHED" | "DRAFT", price: number) => {
      const prod = await tx.product.create({
        data: { vendorId, categoryId, nameAr: "منتج", nameEn: "Product", slug: `p-${rnd()}`, status, basePrice: price },
      });
      const variant = await tx.productVariant.create({
        data: { productId: prod.id, sku: `SKU-${rnd()}${rnd()}`, price, stock: 10 },
      });
      return { product: prod.id, variant: variant.id };
    };
    const a = await p(vendorA, catBisht, "PUBLISHED", 200_000);
    const aDraft = await p(vendorA, catBisht, "DRAFT", 210_000);
    const b = await p(vendorB, catBisht, "PUBLISHED", 195_000);
    const bDraft = await p(vendorB, catBisht, "DRAFT", 199_000);
    const c = await p(vendorC, catOud, "PUBLISHED", 50_000);
    await tx.variantNegotiationSettings.create({
      data: { variantId: a.variant, floorPrice: FLOOR_A, autoAcceptPrice: AUTO_A },
    });
    await tx.variantNegotiationSettings.create({
      data: { variantId: b.variant, floorPrice: FLOOR_B, autoAcceptPrice: AUTO_B },
    });
    return {
      customer1,
      customer2,
      ownerA,
      ownerB,
      ownerC,
      vendorA,
      vendorB,
      vendorC,
      catBisht,
      catOud,
      city,
      productA: a.product,
      productADraft: aDraft.product,
      productB: b.product,
      productBDraft: bDraft.product,
      productC: c.product,
      variantA: a.variant,
      variantB: b.variant,
      variantBDraft: bDraft.variant,
      variantC: c.variant,
    };
  });
}

export const vendorCtx = (s: Seed, which: "A" | "B" | "C") =>
  ({ kind: "vendor", userId: s[`owner${which}`], vendorId: s[`vendor${which}`] }) as const;
export const customerCtx = (s: Seed, which: 1 | 2) => ({ kind: "customer", userId: s[`customer${which}`] }) as const;
export const SYS = { kind: "system", reason: "test" } as const;

export function percentile(values: number[], p: number) {
  const a = [...values].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1)]!;
}
