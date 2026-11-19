import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { randomToken, sha256 } from "@/lib/auth/crypto";
import { asSystem, NotFoundError, withCtx, type Ctx, type Tx } from "@/lib/db";
import { mediaUrl } from "@/lib/providers/storage";
import { normalizeSaudiMobile } from "@/lib/phone";
import { sanitizePlainText } from "@/lib/text";
import { vatOfGross } from "@/lib/vat";
import { getSetting } from "@/lib/settings";
import { CodedError } from "@/features/common/action";
import { uuid, type Locale } from "@/features/common/schema";
import { MAX_QTY_PER_LINE } from "@/features/catalog/schema";
import { PUBLIC_PRODUCT_WHERE, optionsLabel, stockLevelOf } from "@/features/catalog/queries";
import {
  MAX_ADDRESSES,
  MAX_CART_LINES,
  addToCartInput,
  addressDTO,
  addressInput,
  cartDTO,
  checkoutAddressStepDTO,
  cityDTO,
  shippingQuoteDTO,
  shippingQuoteInput,
  updateAddressInput,
  updateCartLineInput,
  removeCartLineInput,
  type AddressDTO,
  type CartDTO,
  type CartLineDTO,
  type CheckoutAddressStepDTO,
  type CityDTO,
  type ShippingQuoteDTO,
} from "./schema";

/**
 * Cart service (M1-02 / P2-02).
 * Owner = a signed-in user (customer RLS context, carts_own) or a guest identified by a random
 * cookie token whose SHA-256 is stored (carts have no public policy, so guest cart rows are read
 * and written in a narrow asSystem step ALWAYS filtered by that hash).
 * Line details (names, prices, stock) are read in a system step limited to the cart's own items, so
 * a line whose product was unpublished still shows its name — marked unavailable, excluded from
 * totals, never silently deleted (D33-1 spirit).
 */
export class CartError extends CodedError {}

export type CartOwner = { kind: "user"; userId: string } | { kind: "guest"; token: string | null };
export const GUEST_CART_TTL_DAYS = 30;
export const cartCookieName = () => (process.env.NODE_ENV === "production" ? "__Host-szl_cart" : "szl_cart");
export function cartCookie(token: string) {
  return {
    name: cartCookieName(),
    value: token,
    options: {
      httpOnly: true as const,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/" as const,
      maxAge: GUEST_CART_TTL_DAYS * 24 * 3600,
    },
  };
}

const ctxOf = (o: CartOwner): Ctx => (o.kind === "user" ? { kind: "customer", userId: o.userId } : { kind: "public" });
const validToken = (t: string | null | undefined): t is string => !!t && t.length >= 20 && t.length <= 200;

async function findCart(tx: Tx, ctx: Ctx, o: CartOwner): Promise<{ id: string } | null> {
  if (o.kind === "user") return tx.cart.findUnique({ where: { userId: o.userId }, select: { id: true } });
  if (!validToken(o.token)) return null;
  const hash = sha256(o.token);
  return asSystem(tx, ctx, () =>
    tx.cart.findFirst({
      where: { guestTokenHash: hash, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true },
    }),
  );
}

async function ensureCart(tx: Tx, ctx: Ctx, o: CartOwner): Promise<{ id: string; newToken: string | null }> {
  const existing = await findCart(tx, ctx, o);
  const expiresAt = new Date(Date.now() + GUEST_CART_TTL_DAYS * 86_400_000);
  if (existing) {
    if (o.kind === "guest")
      await asSystem(tx, ctx, () => tx.cart.update({ where: { id: existing.id }, data: { expiresAt } }));
    return { id: existing.id, newToken: null };
  }
  if (o.kind === "user") {
    const c = await tx.cart.create({ data: { userId: o.userId }, select: { id: true } });
    return { id: c.id, newToken: null };
  }
  const token = randomToken();
  const c = await asSystem(tx, ctx, () =>
    tx.cart.create({ data: { guestTokenHash: sha256(token), expiresAt }, select: { id: true } }),
  );
  return { id: c.id, newToken: token };
}

// ------------------------------------------------------------------ line details
const VARIANT_LINE_SELECT = {
  id: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  reservedStock: true,
  isActive: true,
  optionValueIds: true,
  weightGrams: true,
  product: {
    select: {
      id: true,
      slug: true,
      nameAr: true,
      nameEn: true,
      status: true,
      weightGrams: true,
      category: { select: { isActive: true } },
      vendor: { select: { slug: true, storeNameAr: true, storeNameEn: true, status: true } },
      images: { orderBy: { sort: "asc" }, take: 1, select: { path: true, alt: true } },
      options: { orderBy: { sort: "asc" }, select: { values: { select: { id: true, valueAr: true, valueEn: true } } } },
    },
  },
} as const satisfies Prisma.ProductVariantSelect;
type VariantLineRow = Prisma.ProductVariantGetPayload<{ select: typeof VARIANT_LINE_SELECT }>;

const variantPublic = (v: VariantLineRow) =>
  v.isActive &&
  v.product.status === "PUBLISHED" &&
  v.product.category.isActive &&
  (v.product.vendor === null || v.product.vendor.status === "APPROVED");

interface LineSource {
  id: string;
  variantId: string | null;
  bundleId: string | null;
  qty: number;
}
interface DescribedLine extends CartLineDTO {
  weightGrams: number;
}

async function describeLines(tx: Tx, ctx: Ctx, items: LineSource[], loc: Locale): Promise<DescribedLine[]> {
  const variantIds = items.map((i) => i.variantId).filter((x): x is string => !!x);
  const bundleIds = items.map((i) => i.bundleId).filter((x): x is string => !!x);
  // privileged step: limited to the ids already in THIS cart (or the one being added)
  const [variants, bundles] = await asSystem(tx, ctx, () =>
    Promise.all([
      variantIds.length
        ? tx.productVariant.findMany({ where: { id: { in: variantIds } }, select: VARIANT_LINE_SELECT })
        : Promise.resolve([]),
      bundleIds.length
        ? tx.bundle.findMany({
            where: { id: { in: bundleIds } },
            select: {
              id: true,
              slug: true,
              nameAr: true,
              nameEn: true,
              imagePath: true,
              price: true,
              compareAtPrice: true,
              isActive: true,
              items: { select: { qty: true, variant: { select: VARIANT_LINE_SELECT } } },
            },
          })
        : Promise.resolve([]),
    ]),
  );
  const vById = new Map(variants.map((v) => [v.id, v]));
  const bById = new Map(bundles.map((b) => [b.id, b]));
  const L = (r: { nameAr: string; nameEn: string }) => (loc === "en" ? r.nameEn || r.nameAr : r.nameAr || r.nameEn);
  const out: DescribedLine[] = [];
  for (const it of items) {
    if (it.variantId) {
      const v = vById.get(it.variantId);
      if (!v) continue;
      const avail = Math.max(0, v.stock - v.reservedStock);
      const maxQty = variantPublic(v) ? Math.min(avail, MAX_QTY_PER_LINE) : 0;
      const name = L(v.product);
      const available = maxQty > 0;
      const img = v.product.images[0];
      out.push({
        id: it.id,
        kind: "VARIANT",
        variantId: v.id,
        bundleId: null,
        slug: v.product.slug,
        name,
        optionsLabel: optionsLabel(v.optionValueIds, v.product.options, loc),
        image: img ? { url: mediaUrl(img.path), alt: img.alt || name } : null,
        unitPrice: v.price,
        compareAtPrice: v.compareAtPrice !== null && v.compareAtPrice > v.price ? v.compareAtPrice : null,
        qty: it.qty,
        lineTotal: v.price * it.qty,
        stockLevel: variantPublic(v) ? stockLevelOf(avail) : "OUT",
        maxQty,
        available,
        qtyExceedsStock: available && it.qty > maxQty,
        vendor: v.product.vendor
          ? {
              slug: v.product.vendor.slug,
              name: loc === "en" ? v.product.vendor.storeNameEn : v.product.vendor.storeNameAr,
            }
          : null,
        weightGrams: (v.weightGrams ?? v.product.weightGrams) * it.qty,
      });
    } else if (it.bundleId) {
      const b = bById.get(it.bundleId);
      if (!b) continue;
      const ok = b.isActive && b.items.length > 0 && b.items.every((bi) => variantPublic(bi.variant));
      const maxQty = ok
        ? Math.min(
            MAX_QTY_PER_LINE,
            ...b.items.map((bi) => Math.floor(Math.max(0, bi.variant.stock - bi.variant.reservedStock) / bi.qty)),
          )
        : 0;
      const name = L(b);
      out.push({
        id: it.id,
        kind: "BUNDLE",
        variantId: null,
        bundleId: b.id,
        slug: b.slug,
        name,
        optionsLabel: "",
        image: b.imagePath ? { url: mediaUrl(b.imagePath), alt: name } : null,
        unitPrice: b.price,
        compareAtPrice: b.compareAtPrice !== null && b.compareAtPrice > b.price ? b.compareAtPrice : null,
        qty: it.qty,
        lineTotal: b.price * it.qty,
        stockLevel: stockLevelOf(maxQty),
        maxQty,
        available: maxQty > 0,
        qtyExceedsStock: maxQty > 0 && it.qty > maxQty,
        vendor: null, // bundles are platform-only (SPEC §5)
        weightGrams:
          b.items.reduce((s, bi) => s + (bi.variant.weightGrams ?? bi.variant.product.weightGrams) * bi.qty, 0) *
          it.qty,
      });
    }
  }
  return out;
}

async function cartItems(tx: Tx, ctx: Ctx, o: CartOwner, cartId: string) {
  const q = () =>
    tx.cartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: "asc" },
      select: { id: true, variantId: true, bundleId: true, qty: true },
    });
  return o.kind === "guest" ? asSystem(tx, ctx, q) : q();
}

function toCartDTO(lines: DescribedLine[], vatRateBp: number): CartDTO {
  const ok = lines.filter((l) => l.available);
  const subtotal = ok.reduce((s, l) => s + l.lineTotal, 0);
  return cartDTO.parse({
    lines: lines.map(({ weightGrams: _w, ...l }) => (void _w, l)),
    itemCount: ok.reduce((s, l) => s + l.qty, 0),
    subtotal,
    vatIncluded: vatOfGross(subtotal, vatRateBp),
    hasIssues: lines.some((l) => !l.available || l.qtyExceedsStock),
    storeCount: new Set(ok.map((l) => l.vendor?.slug ?? "")).size,
  });
}

async function vatRate(tx: Tx, ctx: Ctx) {
  // settings are private by default: read the VAT rate in a system step
  return asSystem(tx, ctx, () => getSetting(tx, "vatRate"));
}

async function buildCart(tx: Tx, ctx: Ctx, o: CartOwner, loc: Locale) {
  const cart = await findCart(tx, ctx, o);
  const lines = cart ? await describeLines(tx, ctx, await cartItems(tx, ctx, o, cart.id), loc) : [];
  return { cart: toCartDTO(lines, await vatRate(tx, ctx)), lines };
}

// ------------------------------------------------------------------ public API
export async function getCart(o: CartOwner, loc: Locale = "ar"): Promise<CartDTO> {
  const ctx = ctxOf(o);
  return withCtx(ctx, async (tx) => (await buildCart(tx, ctx, o, loc)).cart);
}

export interface CartMutation {
  cart: CartDTO;
  /** set when a guest cart was just created: the action stores it in the cookie */
  newGuestToken: string | null;
}

export async function addToCart(o: CartOwner, raw: unknown): Promise<CartMutation> {
  const input = addToCartInput.parse(raw);
  const ctx = ctxOf(o);
  return withCtx(ctx, async (tx) => {
    // the target must be visible to the public (checked in the caller's context, not system)
    if (input.variantId) {
      const ok = await tx.productVariant.findFirst({
        where: { id: input.variantId, isActive: true, product: PUBLIC_PRODUCT_WHERE },
        select: { id: true },
      });
      if (!ok) throw new CartError("NOT_AVAILABLE");
    } else {
      const ok = await tx.bundle.findUnique({ where: { id: input.bundleId! }, select: { id: true } });
      if (!ok) throw new CartError("NOT_AVAILABLE");
    }
    const { id: cartId, newToken } = await ensureCart(tx, ctx, o);
    const owner: CartOwner = newToken ? { kind: "guest", token: newToken } : o;
    const items = await cartItems(tx, ctx, owner, cartId);
    const same = items.find((i) => (input.variantId ? i.variantId === input.variantId : i.bundleId === input.bundleId));
    const wanted = (same?.qty ?? 0) + input.qty;
    const [probe] = await describeLines(
      tx,
      ctx,
      [
        {
          id: same?.id ?? "00000000-0000-4000-8000-000000000000",
          variantId: input.variantId ?? null,
          bundleId: input.bundleId ?? null,
          qty: wanted,
        },
      ],
      input.locale,
    );
    if (!probe || !probe.available) throw new CartError(probe && probe.maxQty === 0 ? "OUT_OF_STOCK" : "NOT_AVAILABLE");
    if (wanted > probe.maxQty) throw new CartError(probe.maxQty < MAX_QTY_PER_LINE ? "OUT_OF_STOCK" : "QTY_LIMIT");
    const write = async () => {
      if (same) await tx.cartItem.update({ where: { id: same.id }, data: { qty: wanted } });
      else {
        if (items.length >= MAX_CART_LINES) throw new CartError("CART_LIMIT");
        await tx.cartItem.create({
          data: { cartId, variantId: input.variantId ?? null, bundleId: input.bundleId ?? null, qty: input.qty },
        });
      }
    };
    await (owner.kind === "guest" ? asSystem(tx, ctx, write) : write());
    return { cart: (await buildCart(tx, ctx, owner, input.locale)).cart, newGuestToken: newToken };
  });
}

/** qty 0 removes the line. Lowering qty is always allowed; raising is capped by stock. */
export async function updateCartLine(o: CartOwner, raw: unknown): Promise<CartDTO> {
  const input = updateCartLineInput.parse(raw);
  const ctx = ctxOf(o);
  return withCtx(ctx, async (tx) => {
    const cart = await findCart(tx, ctx, o);
    if (!cart) throw new NotFoundError();
    const items = await cartItems(tx, ctx, o, cart.id);
    const line = items.find((i) => i.id === input.lineId);
    if (!line) throw new NotFoundError();
    const write = async () => {
      if (input.qty === 0) await tx.cartItem.delete({ where: { id: line.id } });
      else await tx.cartItem.update({ where: { id: line.id }, data: { qty: input.qty } });
    };
    if (input.qty > line.qty) {
      const [probe] = await describeLines(tx, ctx, [{ ...line, qty: input.qty }], input.locale);
      if (!probe?.available) throw new CartError("NOT_AVAILABLE");
      if (input.qty > probe.maxQty) throw new CartError("OUT_OF_STOCK");
    }
    await (o.kind === "guest" ? asSystem(tx, ctx, write) : write());
    return (await buildCart(tx, ctx, o, input.locale)).cart;
  });
}

export async function removeCartLine(o: CartOwner, raw: unknown): Promise<CartDTO> {
  const input = removeCartLineInput.parse(raw);
  return updateCartLine(o, { lineId: input.lineId, qty: 0, locale: input.locale });
}

/**
 * After login: move the guest cart into the user's cart (same variant/bundle -> quantities added,
 * capped at MAX_QTY_PER_LINE; stock is re-checked on display). The guest cart is deleted.
 * Returns the number of lines merged. Safe to call with an unknown/expired token.
 */
export async function mergeGuestCart(userId: string, guestToken: string | null | undefined): Promise<number> {
  if (!validToken(guestToken)) return 0;
  const ctx: Ctx = { kind: "customer", userId };
  return withCtx(ctx, async (tx) => {
    const guest = await findCart(tx, ctx, { kind: "guest", token: guestToken });
    if (!guest) return 0;
    const guestItems = await cartItems(tx, ctx, { kind: "guest", token: guestToken }, guest.id);
    const { id: cartId } = await ensureCart(tx, ctx, { kind: "user", userId });
    const mine = await tx.cartItem.findMany({
      where: { cartId },
      select: { id: true, variantId: true, bundleId: true, qty: true },
    });
    let merged = 0;
    for (const g of guestItems) {
      const same = mine.find((m) => (g.variantId ? m.variantId === g.variantId : m.bundleId === g.bundleId));
      if (same)
        await tx.cartItem.update({
          where: { id: same.id },
          data: { qty: Math.min(MAX_QTY_PER_LINE, same.qty + g.qty) },
        });
      else if (mine.length + merged < MAX_CART_LINES)
        await tx.cartItem.create({
          data: { cartId, variantId: g.variantId, bundleId: g.bundleId, qty: Math.min(MAX_QTY_PER_LINE, g.qty) },
        });
      else continue;
      merged++;
    }
    await asSystem(tx, ctx, () => tx.cart.delete({ where: { id: guest.id } }));
    return merged;
  });
}

// ------------------------------------------------------------------ addresses + checkout step
const ADDRESS_SELECT = {
  id: true,
  label: true,
  recipientName: true,
  recipientPhone: true,
  district: true,
  street: true,
  buildingNo: true,
  postalCode: true,
  nationalAddressShort: true,
  isDefault: true,
  city: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
} as const satisfies Prisma.AddressSelect;
type AddressRow = Prisma.AddressGetPayload<{ select: typeof ADDRESS_SELECT }>;
const cityOf = (c: { id: string; slug: string; nameAr: string; nameEn: string }, loc: Locale): CityDTO =>
  cityDTO.parse({ id: c.id, slug: c.slug, name: loc === "en" ? c.nameEn : c.nameAr });
const toAddress = (a: AddressRow, loc: Locale): AddressDTO => addressDTO.parse({ ...a, city: cityOf(a.city, loc) });

export async function listCities(loc: Locale = "ar"): Promise<CityDTO[]> {
  return withCtx({ kind: "public" }, async (tx) =>
    (await tx.city.findMany({ orderBy: [{ sort: "asc" }, { nameAr: "asc" }] })).map((c) => cityOf(c, loc)),
  );
}

export async function listAddresses(userId: string, loc: Locale = "ar"): Promise<AddressDTO[]> {
  return withCtx({ kind: "customer", userId }, async (tx) =>
    (
      await tx.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: ADDRESS_SELECT,
      })
    ).map((a) => toAddress(a, loc)),
  );
}

function cleanAddress(a: z.output<typeof addressInput>) {
  const phone = normalizeSaudiMobile(a.recipientPhone);
  if (!phone) throw new CartError("VALIDATION");
  const t = (s: string, max: number) => sanitizePlainText(s, max);
  return {
    label: a.label ? t(a.label, 40) || null : null,
    recipientName: t(a.recipientName, 80),
    recipientPhone: phone,
    cityId: a.cityId,
    district: t(a.district, 80),
    street: t(a.street, 120),
    buildingNo: a.buildingNo ? t(a.buildingNo, 10) || null : null,
    postalCode: a.postalCode,
    nationalAddressShort: a.nationalAddressShort,
    isDefault: a.isDefault,
  };
}

/** Create (no id) or update (with id) one of the signed-in customer's addresses. */
export async function saveAddress(userId: string, raw: unknown, loc: Locale = "ar"): Promise<AddressDTO> {
  const parsed = z.union([updateAddressInput, addressInput]).parse(raw);
  const id = "id" in parsed ? parsed.id : null;
  const data = cleanAddress(parsed);
  if (!data.recipientName || !data.district || !data.street) throw new CartError("VALIDATION");
  return withCtx({ kind: "customer", userId }, async (tx) => {
    const city = await tx.city.findUnique({ where: { id: data.cityId }, select: { id: true } });
    if (!city) throw new CartError("CITY_NOT_FOUND");
    const count = await tx.address.count({ where: { userId } });
    if (!id && count >= MAX_ADDRESSES) throw new CartError("ADDRESS_LIMIT");
    const makeDefault = data.isDefault || count === 0;
    if (makeDefault) await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    const row = id
      ? await tx.address
          .update({
            where: { id, userId },
            data: { ...data, isDefault: makeDefault || undefined },
            select: ADDRESS_SELECT,
          })
          .catch((e: { code?: string }) => {
            if (e.code === "P2025") throw new NotFoundError();
            throw e;
          })
      : await tx.address.create({ data: { ...data, userId, isDefault: makeDefault }, select: ADDRESS_SELECT });
    return toAddress(row, loc);
  });
}

export async function deleteAddress(userId: string, rawId: string): Promise<void> {
  const addressId = uuid.parse(rawId);
  await withCtx({ kind: "customer", userId }, async (tx) => {
    const r = await tx.address.deleteMany({ where: { id: addressId, userId } });
    if (r.count === 0) throw new NotFoundError();
  });
}

export async function getCheckoutAddressStep(userId: string, loc: Locale = "ar"): Promise<CheckoutAddressStepDTO> {
  const o: CartOwner = { kind: "user", userId };
  const ctx = ctxOf(o);
  return withCtx(ctx, async (tx) => {
    const { cart } = await buildCart(tx, ctx, o, loc);
    const addresses = (
      await tx.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: ADDRESS_SELECT,
      })
    ).map((a) => toAddress(a, loc));
    const cities = (await tx.city.findMany({ orderBy: [{ sort: "asc" }, { nameAr: "asc" }] })).map((c) =>
      cityOf(c, loc),
    );
    return checkoutAddressStepDTO.parse({
      cart,
      addresses,
      cities,
      selectedAddressId: addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
    });
  });
}

/**
 * Shipping quote for the address step. One shipment per store (D3). Rate per shipment from the
 * ShippingZone covering the address city: baseFee + perKgFee × started kg, free when the store's
 * items reach freeShippingOver. The formula is a placeholder until the owner sets shipping (O4/D17).
 */
export async function quoteShipping(userId: string, raw: unknown): Promise<ShippingQuoteDTO> {
  const input = shippingQuoteInput.parse(raw);
  const o: CartOwner = { kind: "user", userId };
  const ctx = ctxOf(o);
  return withCtx(ctx, async (tx) => {
    const address = await tx.address.findFirst({ where: { id: input.addressId, userId }, select: { cityId: true } });
    if (!address) throw new NotFoundError();
    const { cart, lines } = await buildCart(tx, ctx, o, input.locale);
    if (cart.itemCount === 0) throw new CartError("NOT_AVAILABLE");
    const link = await tx.shippingZoneCity.findFirst({
      where: { cityId: address.cityId, zone: { isActive: true } },
      select: { zone: true },
    });
    if (!link) throw new CartError("SHIPPING_UNAVAILABLE");
    const z = link.zone;
    const groups = new Map<string, DescribedLine[]>();
    for (const l of lines.filter((x) => x.available)) {
      const k = l.vendor?.slug ?? "";
      groups.set(k, [...(groups.get(k) ?? []), l]);
    }
    const shipments = [...groups.values()].map((ls) => {
      const itemsTotal = ls.reduce((s, l) => s + l.lineTotal, 0);
      const weightGrams = ls.reduce((s, l) => s + l.weightGrams, 0);
      const free = z.freeShippingOver !== null && itemsTotal >= z.freeShippingOver;
      const fee = free ? 0 : z.baseFee + z.perKgFee * Math.ceil(weightGrams / 1000);
      return { vendor: ls[0]!.vendor, itemsTotal, weightGrams, fee, freeShipping: free, etaDays: z.etaDays };
    });
    const shippingTotal = shipments.reduce((s, x) => s + x.fee, 0);
    const grandTotal = cart.subtotal + shippingTotal;
    return shippingQuoteDTO.parse({
      addressId: input.addressId,
      shipments,
      subtotal: cart.subtotal,
      shippingTotal,
      grandTotal,
      vatIncluded: vatOfGross(grandTotal, await vatRate(tx, ctx)),
      paymentAvailable: false,
    });
  });
}
