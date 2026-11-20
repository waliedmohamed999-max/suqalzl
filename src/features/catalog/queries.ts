import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { NotFoundError, withCtx, type Tx } from "@/lib/db";
import { mediaUrl } from "@/lib/providers/storage";
import type { Locale } from "@/features/common/schema";
import { PUBLIC_VENDOR_SELECT, toPublicVendor } from "@/features/vendors/dto";
import { bnplBuilder } from "@/features/payments/bnpl";
import {
  LOW_STOCK_THRESHOLD,
  MAX_QTY_PER_LINE,
  bundleDetailDTO,
  homeDTO,
  parseProductListParams,
  productDetailDTO,
  productListDTO,
  productListInput,
  searchInput,
  searchResultDTO,
  searchSuggestDTO,
  searchSuggestInput,
  type BundleCardDTO,
  type BundleDetailDTO,
  type CategoryDTO,
  type HomeDTO,
  type HomeSectionDTO,
  type ProductCardDTO,
  type ProductDetailDTO,
  type ProductListDTO,
  type ProductListInput,
  type SearchInput,
  type SearchResultDTO,
  type SearchSuggestDTO,
  type StockLevel,
} from "./schema";

/**
 * Public catalogue queries (M1-02 / P2-01). Always the `public` RLS context (products_public_read:
 * PUBLISHED only; vendors_public_read: APPROVED only), plus the service-layer visibility rule below
 * (RLS is the second layer, D34). Every result is parsed with its .strict() DTO before returning.
 *
 * Invariant used for price filters/sorting: Product.basePrice = lowest ACTIVE variant price and
 * Product.compareAtPrice = that variant's compare-at (kept by the admin service and the seed).
 */
const PUBLIC = { kind: "public" } as const;

/** published, active category, at least one active variant, platform or APPROVED store */
export const PUBLIC_PRODUCT_WHERE = {
  status: "PUBLISHED",
  category: { isActive: true },
  variants: { some: { isActive: true } },
  OR: [{ vendorId: null }, { vendor: { status: "APPROVED" } }],
} as const satisfies Prisma.ProductWhereInput;

const L = <T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string => {
  const ar = row[`${field}Ar`] as string | null | undefined;
  const en = row[`${field}En`] as string | null | undefined;
  return (locale === "en" ? en || ar : ar || en) ?? "";
};
const Lnull = <T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string | null =>
  L(row, field, locale) || null;

export function stockLevelOf(available: number): StockLevel {
  if (available <= 0) return "OUT";
  return available <= LOW_STOCK_THRESHOLD ? "LOW" : "IN_STOCK";
}
const bestLevel = (levels: StockLevel[]): StockLevel =>
  levels.includes("IN_STOCK") ? "IN_STOCK" : levels.includes("LOW") ? "LOW" : "OUT";

export const CARD_SELECT = {
  id: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  isFeatured: true,
  ratingAvg: true,
  ratingCount: true,
  images: { orderBy: { sort: "asc" }, take: 1, select: { path: true, alt: true } },
  variants: {
    where: { isActive: true },
    orderBy: { price: "asc" },
    select: { id: true, price: true, compareAtPrice: true, stock: true, reservedStock: true },
  },
  vendor: { select: { slug: true, storeNameAr: true, storeNameEn: true } },
} as const satisfies Prisma.ProductSelect;
type CardRow = Prisma.ProductGetPayload<{ select: typeof CARD_SELECT }>;

export function imageOf(img: { path: string; alt: string | null } | undefined, fallbackAlt: string) {
  return img ? { url: mediaUrl(img.path), alt: img.alt || fallbackAlt } : null;
}

export function toCard(p: CardRow, locale: Locale): ProductCardDTO {
  const name = L(p, "name", locale);
  const vs = p.variants;
  const cheapest = vs[0]!;
  const levels = vs.map((v) => stockLevelOf(v.stock - v.reservedStock));
  const inStockVariants = vs.filter((v) => v.stock - v.reservedStock > 0);
  return {
    id: p.id,
    slug: p.slug,
    name,
    image: imageOf(p.images[0], name),
    price: cheapest.price,
    compareAtPrice:
      cheapest.compareAtPrice !== null && cheapest.compareAtPrice > cheapest.price ? cheapest.compareAtPrice : null,
    priceFrom: new Set(vs.map((v) => v.price)).size > 1,
    hasOptions: vs.length > 1,
    defaultVariantId: vs.length === 1 && inStockVariants.length === 1 ? cheapest.id : null,
    stockLevel: bestLevel(levels),
    isFeatured: p.isFeatured,
    ratingAvg: p.ratingAvg.toFixed(2),
    ratingCount: p.ratingCount,
    vendor: p.vendor ? { slug: p.vendor.slug, name: L(p.vendor, "storeName", locale) } : null,
  };
}

async function cards(
  tx: Tx,
  where: Prisma.ProductWhereInput,
  locale: Locale,
  take: number,
  orderBy?: Prisma.ProductOrderByWithRelationInput[],
) {
  const rows = await tx.product.findMany({
    where: { AND: [PUBLIC_PRODUCT_WHERE, where] },
    orderBy: orderBy ?? [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take,
    select: CARD_SELECT,
  });
  return rows.map((r) => toCard(r, locale));
}

// ------------------------------------------------------------------ categories
async function categoryCounts(tx: Tx): Promise<Map<string, number>> {
  const g = await tx.product.groupBy({ by: ["categoryId"], where: PUBLIC_PRODUCT_WHERE, _count: { _all: true } });
  return new Map(g.map((x) => [x.categoryId, x._count._all]));
}

export async function listCategories(locale: Locale = "ar", opts: { homeOnly?: boolean } = {}): Promise<CategoryDTO[]> {
  return withCtx(PUBLIC, (tx) => listCategoriesTx(tx, locale, opts));
}
async function listCategoriesTx(tx: Tx, locale: Locale, opts: { homeOnly?: boolean }) {
  const [cats, counts] = await Promise.all([
    tx.category.findMany({
      where: opts.homeOnly ? { showOnHome: true } : {},
      orderBy: opts.homeOnly ? [{ homeSort: "asc" }, { sort: "asc" }] : [{ sort: "asc" }, { nameAr: "asc" }],
      select: { id: true, slug: true, nameAr: true, nameEn: true, imagePath: true, parent: { select: { slug: true } } },
    }),
    categoryCounts(tx),
  ]);
  return cats.map((c) => {
    const name = L(c, "name", locale);
    return {
      id: c.id,
      slug: c.slug,
      name,
      image: c.imagePath ? { url: mediaUrl(c.imagePath), alt: name } : null,
      parentSlug: c.parent?.slug ?? null,
      productCount: counts.get(c.id) ?? 0,
    };
  });
}

// ------------------------------------------------------------------ bundles
const BUNDLE_SELECT = {
  id: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  imagePath: true,
  price: true,
  compareAtPrice: true,
  items: {
    orderBy: { id: "asc" },
    select: {
      qty: true,
      variantId: true,
      variant: {
        select: {
          id: true,
          price: true,
          stock: true,
          reservedStock: true,
          isActive: true,
          optionValueIds: true,
          product: {
            select: {
              id: true,
              slug: true,
              nameAr: true,
              nameEn: true,
              status: true,
              vendorId: true,
              images: { orderBy: { sort: "asc" }, take: 1, select: { path: true, alt: true } },
              options: {
                orderBy: { sort: "asc" },
                select: { values: { select: { id: true, valueAr: true, valueEn: true } } },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.BundleSelect;
type BundleRow = Prisma.BundleGetPayload<{ select: typeof BUNDLE_SELECT }>;

export function optionsLabel(
  optionValueIds: string[],
  options: { values: { id: string; valueAr: string; valueEn: string }[] }[],
  locale: Locale,
): string {
  const byId = new Map(options.flatMap((o) => o.values).map((v) => [v.id, v]));
  return optionValueIds
    .map((id) => byId.get(id))
    .filter((v): v is { id: string; valueAr: string; valueEn: string } => !!v)
    .map((v) => L(v, "value", locale))
    .join(" / ");
}

function toBundle(b: BundleRow, locale: Locale): Omit<BundleDetailDTO, "bnpl"> {
  const name = L(b, "name", locale);
  const items = b.items.map((it) => {
    const v = it.variant;
    const p = v?.product;
    const available = !!v && !!p && v.isActive && p.status === "PUBLISHED" && v.stock - v.reservedStock >= it.qty;
    const pname = p ? L(p, "name", locale) : "";
    return {
      qty: it.qty,
      variantId: it.variantId,
      optionsLabel: v && p ? optionsLabel(v.optionValueIds, p.options, locale) : "",
      product: { slug: p?.slug ?? "", name: pname, image: imageOf(p?.images[0], pname) },
      unitPrice: v?.price ?? 0,
      available,
      _avail: v ? Math.floor((v.stock - v.reservedStock) / it.qty) : 0,
    };
  });
  const allOk = items.length > 0 && items.every((i) => i.available);
  const maxQty = allOk ? Math.min(MAX_QTY_PER_LINE, ...items.map((i) => i._avail)) : 0;
  return {
    id: b.id,
    slug: b.slug,
    name,
    image: b.imagePath ? { url: mediaUrl(b.imagePath), alt: name } : null,
    price: b.price,
    compareAtPrice: b.compareAtPrice !== null && b.compareAtPrice > b.price ? b.compareAtPrice : null,
    itemsValue: allOk ? items.reduce((s, i) => s + i.unitPrice * i.qty, 0) : null,
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    inStock: maxQty > 0,
    items: items.map(({ _avail, ...rest }) => (void _avail, rest)),
    maxQty,
  };
}
const toBundleCard = (b: BundleRow, locale: Locale): BundleCardDTO => {
  const { items: _items, maxQty: _max, ...card } = toBundle(b, locale);
  void _items;
  void _max;
  return card;
};

export async function getBundle(slugValue: string, locale: Locale = "ar"): Promise<BundleDetailDTO> {
  return withCtx(PUBLIC, async (tx) => {
    const b = await tx.bundle.findUnique({ where: { slug: slugValue }, select: BUNDLE_SELECT });
    if (!b) throw new NotFoundError();
    const bnpl = await bnplBuilder(tx, PUBLIC);
    return bundleDetailDTO.parse({ ...toBundle(b, locale), bnpl: bnpl(b.price) });
  });
}

// ------------------------------------------------------------------ home
export async function getHome(locale: Locale = "ar", now = new Date()): Promise<HomeDTO> {
  return withCtx(PUBLIC, async (tx) => {
    const sections = await tx.homeSection.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
    const out: HomeSectionDTO[] = [];
    for (const s of sections) {
      const base = { id: s.id, sort: s.sort };
      switch (s.type) {
        case "BANNERS": {
          const banners = await tx.banner.findMany({
            where: {
              AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
              ],
            },
            orderBy: { sort: "asc" },
          });
          if (banners.length)
            out.push({
              ...base,
              type: "BANNERS",
              banners: banners.map((b) => {
                const title = Lnull(b, "title", locale);
                return {
                  id: b.id,
                  title,
                  link: b.link,
                  imageDesktop: { url: mediaUrl(b.imageDesktopPath), alt: title ?? "" },
                  imageMobile: { url: mediaUrl(b.imageMobilePath), alt: title ?? "" },
                };
              }),
            });
          break;
        }
        case "CATEGORIES": {
          const categories = await listCategoriesTx(tx, locale, { homeOnly: true });
          if (categories.length) out.push({ ...base, type: "CATEGORIES", categories });
          break;
        }
        case "BUNDLES": {
          const rows = await tx.bundle.findMany({ orderBy: { createdAt: "asc" }, take: 8, select: BUNDLE_SELECT });
          const bundles = rows.map((b) => toBundleCard(b, locale));
          if (bundles.length) out.push({ ...base, type: "BUNDLES", bundles });
          break;
        }
        case "CATEGORY_PRODUCTS": {
          if (!s.refId) break;
          const cat = await tx.category.findUnique({
            where: { id: s.refId },
            select: { id: true, slug: true, nameAr: true, nameEn: true },
          });
          if (!cat) break;
          const products = await cards(tx, { categoryId: cat.id }, locale, 8);
          if (products.length)
            out.push({
              ...base,
              type: "CATEGORY_PRODUCTS",
              category: { slug: cat.slug, name: L(cat, "name", locale) },
              products,
            });
          break;
        }
        case "FEATURED": {
          const products = await cards(tx, { isFeatured: true }, locale, 12);
          if (products.length) out.push({ ...base, type: "FEATURED", products });
          break;
        }
      }
    }
    return homeDTO.parse({ sections: out });
  });
}

// ------------------------------------------------------------------ product list
const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ isFeatured: "desc" }, { soldCount: "desc" }, { publishedAt: "desc" }, { id: "asc" }],
  newest: [{ publishedAt: "desc" }, { id: "asc" }],
  price_asc: [{ basePrice: "asc" }, { id: "asc" }],
  price_desc: [{ basePrice: "desc" }, { id: "asc" }],
  best_selling: [{ soldCount: "desc" }, { id: "asc" }],
};

async function breadcrumbs(tx: Tx, categoryId: string, locale: Locale) {
  const chain: { slug: string; name: string }[] = [];
  let id: string | null = categoryId;
  for (let i = 0; id && i < 5; i++) {
    const c: { slug: string; nameAr: string; nameEn: string; parentId: string | null } | null =
      await tx.category.findUnique({
        where: { id },
        select: { slug: true, nameAr: true, nameEn: true, parentId: true },
      });
    if (!c) break;
    chain.unshift({ slug: c.slug, name: L(c, "name", locale) });
    id = c.parentId;
  }
  return chain;
}

export async function listProducts(input: ProductListInput): Promise<ProductListDTO> {
  const q = productListInput.parse(input);
  return withCtx(PUBLIC, async (tx) => {
    let category: ProductListDTO["category"] = null;
    const scope: Prisma.ProductWhereInput[] = [];
    if (q.category) {
      const cat = await tx.category.findUnique({
        where: { slug: q.category },
        select: {
          id: true,
          slug: true,
          nameAr: true,
          nameEn: true,
          children: { where: { isActive: true }, select: { id: true } },
        },
      });
      if (!cat) throw new NotFoundError();
      scope.push({ categoryId: { in: [cat.id, ...cat.children.map((c) => c.id)] } });
      category = {
        slug: cat.slug,
        name: L(cat, "name", q.locale),
        breadcrumbs: await breadcrumbs(tx, cat.id, q.locale),
      };
    }
    if (q.onSale) scope.push({ compareAtPrice: { not: null } });
    if (q.featured) scope.push({ isFeatured: true });
    if (q.inStock)
      scope.push({ variants: { some: { isActive: true, stock: { gt: tx.productVariant.fields.reservedStock } } } });

    const vendorFilter: Prisma.ProductWhereInput[] = [];
    if (q.vendor) vendorFilter.push(q.vendor === "souq" ? { vendorId: null } : { vendor: { slug: q.vendor } });
    const priceFilter: Prisma.ProductWhereInput[] = [];
    if (q.priceMin !== undefined) priceFilter.push({ basePrice: { gte: q.priceMin } });
    if (q.priceMax !== undefined) priceFilter.push({ basePrice: { lte: q.priceMax } });

    const where: Prisma.ProductWhereInput = { AND: [PUBLIC_PRODUCT_WHERE, ...scope, ...vendorFilter, ...priceFilter] };
    const [total, rows, range, byVendor] = await Promise.all([
      tx.product.count({ where }),
      tx.product.findMany({
        where,
        orderBy: SORTS[q.sort],
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        select: CARD_SELECT,
      }),
      tx.product.aggregate({
        where: { AND: [PUBLIC_PRODUCT_WHERE, ...scope, ...vendorFilter] },
        _min: { basePrice: true },
        _max: { basePrice: true },
      }),
      tx.product.groupBy({
        by: ["vendorId"],
        where: { AND: [PUBLIC_PRODUCT_WHERE, ...scope, ...priceFilter] },
        _count: { _all: true },
      }),
    ]);
    const vendorIds = byVendor.map((v) => v.vendorId).filter((v): v is string => !!v);
    const vendors = vendorIds.length
      ? await tx.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, slug: true, storeNameAr: true, storeNameEn: true },
        })
      : [];
    const vById = new Map(vendors.map((v) => [v.id, v]));
    const facetVendors = byVendor
      .map((g) => {
        if (g.vendorId === null)
          return { slug: "souq", name: q.locale === "en" ? "Souq AlZal" : "سوق الزل", count: g._count._all };
        const v = vById.get(g.vendorId);
        return v ? { slug: v.slug, name: L(v, "storeName", q.locale), count: g._count._all } : null;
      })
      .filter((x): x is { slug: string; name: string; count: number } => !!x)
      .sort((a, b) => b.count - a.count);
    return productListDTO.parse({
      items: rows.map((r) => toCard(r, q.locale)),
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.ceil(total / q.perPage),
      category,
      facets: {
        priceRange:
          range._min.basePrice !== null && range._max.basePrice !== null
            ? { min: range._min.basePrice, max: range._max.basePrice }
            : null,
        vendors: facetVendors,
      },
    });
  });
}

/** Convenience for pages: listProducts(parseProductListParams(searchParams, { locale, category })). */
export { parseProductListParams };

// ------------------------------------------------------------------ product page
export async function getProduct(slugValue: string, loc: Locale = "ar"): Promise<ProductDetailDTO> {
  return withCtx(PUBLIC, async (tx) => {
    const p = await tx.product.findFirst({
      where: { AND: [PUBLIC_PRODUCT_WHERE, { slug: slugValue }] },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        descriptionAr: true,
        descriptionEn: true,
        categoryId: true,
        isFeatured: true,
        ratingAvg: true,
        ratingCount: true,
        seoTitle: true,
        seoDescription: true,
        updatedAt: true,
        category: { select: { slug: true, nameAr: true, nameEn: true } },
        images: { orderBy: { sort: "asc" }, select: { path: true, alt: true } },
        options: {
          orderBy: { sort: "asc" },
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            values: { orderBy: { sort: "asc" }, select: { id: true, valueAr: true, valueEn: true } },
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: [{ price: "asc" }, { sku: "asc" }],
          select: {
            id: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            stock: true,
            reservedStock: true,
            optionValueIds: true,
          },
        },
        vendor: { select: PUBLIC_VENDOR_SELECT },
      },
    });
    if (!p) throw new NotFoundError();
    const name = L(p, "name", loc);
    const optionOrder = p.options.map((o) => new Set(o.values.map((v) => v.id)));
    const bnpl = await bnplBuilder(tx, PUBLIC);
    const variants = p.variants.map((v) => {
      const avail = v.stock - v.reservedStock;
      // option values stored in option order; re-order defensively
      const ordered = optionOrder
        .map((set) => v.optionValueIds.find((id) => set.has(id)))
        .filter((x): x is string => !!x);
      return {
        id: v.id,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice !== null && v.compareAtPrice > v.price ? v.compareAtPrice : null,
        optionValueIds: ordered,
        stockLevel: stockLevelOf(avail),
        maxQty: Math.max(0, Math.min(avail, MAX_QTY_PER_LINE)),
        bnpl: bnpl(v.price),
      };
    });
    const def = variants.find((v) => v.maxQty > 0) ?? variants[0]!;
    const related = await cards(tx, { categoryId: p.categoryId, id: { not: p.id } }, loc, 8);
    const description = Lnull(p, "description", loc);
    return productDetailDTO.parse({
      id: p.id,
      slug: p.slug,
      name,
      description,
      category: { slug: p.category.slug, name: L(p.category, "name", loc) },
      breadcrumbs: await breadcrumbs(tx, p.categoryId, loc),
      images: p.images.map((i) => ({ url: mediaUrl(i.path), alt: i.alt || name })),
      options: p.options.map((o) => ({
        id: o.id,
        name: L(o, "name", loc),
        values: o.values.map((v) => ({ id: v.id, value: L(v, "value", loc) })),
      })),
      variants,
      defaultVariantId: def.id,
      price: def.price,
      compareAtPrice: def.compareAtPrice,
      priceFrom: new Set(variants.map((v) => v.price)).size > 1,
      stockLevel: bestLevel(variants.map((v) => v.stockLevel)),
      isFeatured: p.isFeatured,
      ratingAvg: p.ratingAvg.toFixed(2),
      ratingCount: p.ratingCount,
      vendor: p.vendor ? toPublicVendor(p.vendor) : null,
      seo: {
        title: (loc === "ar" ? p.seoTitle : null) || name,
        description: (loc === "ar" ? p.seoDescription : null) || (description ? description.slice(0, 160) : null),
      },
      related,
      bnpl: bnpl(def.price),
      updatedAt: p.updatedAt.toISOString(),
    });
  });
}

// ------------------------------------------------------------------ search
/** Same normaliser as the stored vector (app.normalize_ar, migration 0012). */
async function normalize(tx: Tx, q: string): Promise<string> {
  const r = await tx.$queryRaw<{ n: string }[]>`SELECT app.normalize_ar(${q}) AS n`;
  return r[0]?.n ?? "";
}

async function matchingIds(tx: Tx, q: string, limit: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT p.id::text AS id
    FROM products p
    WHERE p.search_vector @@ app.search_query(${q})
    ORDER BY ts_rank(p.search_vector, app.search_query(${q})) DESC, p.sold_count DESC, p.id
    LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

async function matchingCategories(tx: Tx, normalized: string, loc: Locale) {
  if (!normalized) return [];
  const rows = await tx.$queryRaw<{ slug: string; name_ar: string; name_en: string }[]>`
    SELECT slug, name_ar, name_en FROM categories
    WHERE position(${normalized} in app.normalize_ar(name_ar)) > 0
       OR position(${normalized} in app.normalize_ar(name_en)) > 0
       OR position(app.normalize_ar(name_ar) in ${normalized}) > 0
    ORDER BY sort LIMIT 5`;
  return rows.map((c) => ({ slug: c.slug, name: loc === "en" ? c.name_en || c.name_ar : c.name_ar }));
}

const SEARCH_CAP = 500;

export async function searchProducts(input: SearchInput): Promise<SearchResultDTO> {
  const q = searchInput.parse(input);
  return withCtx(PUBLIC, async (tx) => {
    const normalized = await normalize(tx, q.q);
    const empty = {
      items: [],
      page: q.page,
      perPage: q.perPage,
      total: 0,
      totalPages: 0,
      q: q.q,
      normalized,
      categories: [],
    };
    if (!normalized) return searchResultDTO.parse(empty);
    const ids = await matchingIds(tx, q.q, SEARCH_CAP);
    const categories = await matchingCategories(tx, normalized, q.locale);
    if (!ids.length) return searchResultDTO.parse({ ...empty, categories });
    const where: Prisma.ProductWhereInput = { AND: [PUBLIC_PRODUCT_WHERE, { id: { in: ids } }] };
    const total = await tx.product.count({ where });
    let rows: CardRow[];
    if (q.sort === "featured") {
      // relevance order from the full-text rank
      const visible = await tx.product.findMany({ where, select: { id: true } });
      const set = new Set(visible.map((v) => v.id));
      const pageIds = ids.filter((id) => set.has(id)).slice((q.page - 1) * q.perPage, q.page * q.perPage);
      const found = await tx.product.findMany({ where: { id: { in: pageIds } }, select: CARD_SELECT });
      const byId = new Map(found.map((f) => [f.id, f]));
      rows = pageIds.map((id) => byId.get(id)).filter((x): x is CardRow => !!x);
    } else {
      rows = await tx.product.findMany({
        where,
        orderBy: SORTS[q.sort],
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        select: CARD_SELECT,
      });
    }
    return searchResultDTO.parse({
      ...empty,
      items: rows.map((r) => toCard(r, q.locale)),
      total,
      totalPages: Math.ceil(total / q.perPage),
      categories,
    });
  });
}

export async function searchSuggest(input: { q: string; locale?: Locale }): Promise<SearchSuggestDTO> {
  const q = searchSuggestInput.parse(input);
  return withCtx(PUBLIC, async (tx) => {
    const normalized = await normalize(tx, q.q);
    if (!normalized) return { products: [], categories: [] };
    const ids = await matchingIds(tx, q.q, 30);
    const rows = ids.length
      ? await tx.product.findMany({ where: { AND: [PUBLIC_PRODUCT_WHERE, { id: { in: ids } }] }, select: CARD_SELECT })
      : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const products = ids
      .map((id) => byId.get(id))
      .filter((x): x is CardRow => !!x)
      .slice(0, 6)
      .map((r) => {
        const c = toCard(r, q.locale);
        return { slug: c.slug, name: c.name, image: c.image, price: c.price };
      });
    return searchSuggestDTO.parse({ products, categories: await matchingCategories(tx, normalized, q.locale) });
  });
}
