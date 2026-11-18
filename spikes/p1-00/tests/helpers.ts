import pg from "pg";
import { randomInt } from "node:crypto";
import { withCtx } from "@/lib/context";

export const FLOOR_A = 150_000; // 1,500.00 SAR — distinctive values, searched for in leak tests
export const AUTO_A = 190_000;
export const FLOOR_B = 140_000;
export const AUTO_B = 185_000;

export async function truncateAll() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`TRUNCATE realtime_events, stock_reservations, price_offers, negotiation_threads,
    price_request_recipients, price_requests, variant_negotiation_settings, product_variants,
    products, categories, vendors, users RESTART IDENTITY CASCADE`);
  await c.end();
}

const phone = () => `+9665${String(randomInt(0, 99_999_999)).padStart(8, "0")}`;

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

/** Seeds through the runtime role in 'system' context (same path as seed.ts would use). */
export async function seed(): Promise<Seed> {
  return withCtx({ kind: "system" }, async (tx) => {
    const u = async (name: string, role: "CUSTOMER" | "VENDOR_OWNER") =>
      (await tx.user.create({ data: { name, phone: phone(), role } })).id;
    const customer1 = await u("عميل 1", "CUSTOMER");
    const customer2 = await u("عميل 2", "CUSTOMER");
    const ownerA = await u("مالك أ", "VENDOR_OWNER");
    const ownerB = await u("مالك ب", "VENDOR_OWNER");
    const ownerC = await u("مالك ج", "VENDOR_OWNER");
    const v = async (owner: string, name: string) =>
      (await tx.vendor.create({ data: { ownerUserId: owner, storeNameAr: name, iban: "SA0380000000608010167519" } })).id;
    const vendorA = await v(ownerA, "متجر أ");
    const vendorB = await v(ownerB, "متجر ب");
    const vendorC = await v(ownerC, "متجر ج");
    const catBisht = (await tx.category.create({ data: { nameAr: "بشوت", slug: `bisht-${randomInt(1e9)}` } })).id;
    const catOud = (await tx.category.create({ data: { nameAr: "عود", slug: `oud-${randomInt(1e9)}` } })).id;
    const p = async (vendorId: string | null, categoryId: string, status: "PUBLISHED" | "DRAFT", price: number) => {
      const prod = await tx.product.create({ data: { vendorId, categoryId, nameAr: "منتج", status, basePrice: price } });
      const variant = await tx.productVariant.create({
        data: { productId: prod.id, sku: `SKU-${randomInt(1e12)}`, price, stock: 10 },
      });
      return { product: prod.id, variant: variant.id };
    };
    const a = await p(vendorA, catBisht, "PUBLISHED", 200_000);
    const aDraft = await p(vendorA, catBisht, "DRAFT", 210_000);
    const b = await p(vendorB, catBisht, "PUBLISHED", 195_000);
    const bDraft = await p(vendorB, catBisht, "DRAFT", 199_000);
    const c = await p(vendorC, catOud, "PUBLISHED", 50_000);
    await tx.variantNegotiationSettings.create({ data: { variantId: a.variant, floorPrice: FLOOR_A, autoAcceptPrice: AUTO_A } });
    await tx.variantNegotiationSettings.create({ data: { variantId: b.variant, floorPrice: FLOOR_B, autoAcceptPrice: AUTO_B } });
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

export const vendorSession = (s: Seed, which: "A" | "B" | "C") =>
  ({
    kind: "vendor",
    userId: s[`owner${which}`],
    vendorId: s[`vendor${which}`],
  }) as const;
export const customerSession = (s: Seed, which: 1 | 2) => ({ kind: "customer", userId: s[`customer${which}`] }) as const;

export function percentile(values: number[], p: number) {
  const a = [...values].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1)]!;
}
