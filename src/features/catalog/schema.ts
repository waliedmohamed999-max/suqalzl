import { z } from "zod";
import { publicVendorDTO } from "@/features/vendors/dto";
import { halalas, imageDTO, isoDate, locale, paged, uuid } from "@/features/common/schema";

/**
 * Store catalogue contracts (M1-02 / P2-01, SPEC §7.1). Public DTOs, localised for `locale`.
 * A store (vendor) appears ONLY as PublicVendorDTO (D36-6) or its two-field card subset below;
 * `vendor: null` = Souq AlZal itself (D6). No cost/negotiation/stock-reservation internals:
 * stock is exposed as a level + a purchasable maximum, never the raw number.
 */
export { publicVendorDTO, type PublicVendorDTO } from "@/features/vendors/dto";

// ------------------------------------------------------------------ small pieces
export const vendorCardDTO = z.object({ slug: z.string(), name: z.string() }).strict();
export type VendorCardDTO = z.infer<typeof vendorCardDTO>;

export const stockLevel = z.enum(["IN_STOCK", "LOW", "OUT"]);
export type StockLevel = z.infer<typeof stockLevel>;
/** LOW when 1..LOW_STOCK_THRESHOLD units can still be bought */
export const LOW_STOCK_THRESHOLD = 3;
/** a single cart line never exceeds this (qty selector max = min(available, MAX_QTY_PER_LINE)) */
export const MAX_QTY_PER_LINE = 10;

export const categoryDTO = z
  .object({
    id: uuid,
    slug: z.string(),
    name: z.string(),
    image: imageDTO.nullable(),
    parentSlug: z.string().nullable(),
    productCount: z.number().int().nonnegative(),
  })
  .strict();
export type CategoryDTO = z.infer<typeof categoryDTO>;

export const breadcrumbDTO = z.object({ slug: z.string(), name: z.string() }).strict();

export const productCardDTO = z
  .object({
    id: uuid,
    slug: z.string(),
    name: z.string(),
    image: imageDTO.nullable(),
    /** lowest active variant price (VAT inclusive, D8) */
    price: halalas,
    /** compare-at of that variant, only when greater than price */
    compareAtPrice: halalas.nullable(),
    /** true when active variants have different prices ("من 1,250") */
    priceFrom: z.boolean(),
    /** > 1 active variant: card shows "متوفر بعدة خيارات" instead of "أضف إلى السلة" */
    hasOptions: z.boolean(),
    /** the variant the card's "add to cart" adds; null when hasOptions or out of stock */
    defaultVariantId: uuid.nullable(),
    stockLevel,
    isFeatured: z.boolean(),
    ratingAvg: z.string(), // "4.80"
    ratingCount: z.number().int().nonnegative(),
    vendor: vendorCardDTO.nullable(),
  })
  .strict();
export type ProductCardDTO = z.infer<typeof productCardDTO>;

export const bannerDTO = z
  .object({
    id: uuid,
    title: z.string().nullable(),
    link: z.string().nullable(),
    imageDesktop: imageDTO,
    imageMobile: imageDTO,
  })
  .strict();
export type BannerDTO = z.infer<typeof bannerDTO>;

export const bundleCardDTO = z
  .object({
    id: uuid,
    slug: z.string(),
    name: z.string(),
    image: imageDTO.nullable(),
    price: halalas,
    compareAtPrice: halalas.nullable(),
    /** sum of the items' current prices (for "وفّر"), null if any item is unavailable */
    itemsValue: halalas.nullable(),
    itemCount: z.number().int().nonnegative(),
    inStock: z.boolean(),
  })
  .strict();
export type BundleCardDTO = z.infer<typeof bundleCardDTO>;

// ------------------------------------------------------------------ home (HomeSection)
const sectionBase = { id: uuid, sort: z.number().int() };
export const homeSectionDTO = z.discriminatedUnion("type", [
  z.object({ ...sectionBase, type: z.literal("BANNERS"), banners: z.array(bannerDTO) }).strict(),
  z.object({ ...sectionBase, type: z.literal("CATEGORIES"), categories: z.array(categoryDTO) }).strict(),
  z.object({ ...sectionBase, type: z.literal("BUNDLES"), bundles: z.array(bundleCardDTO) }).strict(),
  z
    .object({
      ...sectionBase,
      type: z.literal("CATEGORY_PRODUCTS"),
      category: breadcrumbDTO,
      products: z.array(productCardDTO),
    })
    .strict(),
  z.object({ ...sectionBase, type: z.literal("FEATURED"), products: z.array(productCardDTO) }).strict(),
]);
export type HomeSectionDTO = z.infer<typeof homeSectionDTO>;

/** Empty sections (no active banners, empty category...) are dropped by the server. */
export const homeDTO = z.object({ sections: z.array(homeSectionDTO) }).strict();
export type HomeDTO = z.infer<typeof homeDTO>;

// ------------------------------------------------------------------ product list (/products, /c/[slug])
export const PRODUCT_SORTS = ["featured", "newest", "price_asc", "price_desc", "best_selling"] as const;
export const productSort = z.enum(PRODUCT_SORTS);
export type ProductSort = z.infer<typeof productSort>;

/**
 * Filters at launch: price, store, flags only (D33-3). Prices in HALALAS. `vendor: "souq"` = the
 * platform's own products. Unknown/invalid URL values fall back to defaults (parseProductListParams).
 */
export const productListInput = z
  .object({
    locale: locale.default("ar"),
    category: z.string().max(80).optional(),
    vendor: z.string().max(80).optional(),
    priceMin: halalas.optional(),
    priceMax: halalas.optional(),
    onSale: z.boolean().default(false),
    inStock: z.boolean().default(false),
    featured: z.boolean().default(false),
    sort: productSort.default("featured"),
    page: z.number().int().min(1).max(10_000).default(1),
    perPage: z.number().int().min(1).max(48).default(24),
  })
  .strict();
export type ProductListInput = z.input<typeof productListInput>;

export const productListFacetsDTO = z
  .object({
    /** over the category/flags scope, ignoring the price filter (for the slider) */
    priceRange: z.object({ min: halalas, max: halalas }).strict().nullable(),
    vendors: z.array(z.object({ slug: z.string(), name: z.string(), count: z.number().int() }).strict()),
  })
  .strict();

export const productListDTO = paged(productCardDTO)
  .extend({
    category: z
      .object({ slug: z.string(), name: z.string(), breadcrumbs: z.array(breadcrumbDTO) })
      .strict()
      .nullable(),
    facets: productListFacetsDTO,
  })
  .strict();
export type ProductListDTO = z.infer<typeof productListDTO>;

const flag = z
  .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
  .transform((v) => v === "1" || v === "true");

/** URL searchParams -> productListInput. Invalid values are dropped, never thrown (a bad link = defaults). */
export function parseProductListParams(
  sp: URLSearchParams | Record<string, string | string[] | undefined>,
  base: { locale?: "ar" | "en"; category?: string } = {},
): z.output<typeof productListInput> {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return Array.isArray(v) ? v[0] : (v ?? undefined);
  };
  const int = (k: string) => {
    const v = get(k);
    return v && /^\d{1,9}$/.test(v) ? Number(v) : undefined;
  };
  const pick = <T>(schema: z.ZodType<T>, v: unknown) => {
    const r = schema.safeParse(v);
    return r.success ? r.data : undefined;
  };
  const raw = {
    locale: base.locale ?? "ar",
    category: base.category ?? pick(z.string().regex(/^[a-z0-9-]{1,80}$/), get("category")),
    vendor: pick(z.string().regex(/^[a-z0-9-]{1,80}$/), get("vendor")),
    priceMin: int("priceMin"),
    priceMax: int("priceMax"),
    onSale: pick(flag, get("onSale")),
    inStock: pick(flag, get("inStock")),
    featured: pick(flag, get("featured")),
    sort: pick(productSort, get("sort")),
    page: int("page"),
    perPage: int("perPage"),
  };
  const clean = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
  const r = productListInput.safeParse(clean);
  return r.success ? r.data : productListInput.parse({ locale: raw.locale, category: raw.category });
}

// ------------------------------------------------------------------ product page (/p/[slug])
export const productVariantDTO = z
  .object({
    id: uuid,
    sku: z.string(),
    price: halalas,
    compareAtPrice: halalas.nullable(),
    /** one id per option, in option order; [] for a product without options */
    optionValueIds: z.array(uuid),
    stockLevel,
    /** qty selector max: min(available, MAX_QTY_PER_LINE); 0 when out of stock */
    maxQty: z.number().int().nonnegative(),
  })
  .strict();
export type ProductVariantDTO = z.infer<typeof productVariantDTO>;

export const productOptionDTO = z
  .object({
    id: uuid,
    name: z.string(),
    values: z.array(z.object({ id: uuid, value: z.string() }).strict()),
  })
  .strict();

export const productDetailDTO = z
  .object({
    id: uuid,
    slug: z.string(),
    name: z.string(),
    /** plain text with paragraphs separated by blank lines (rich text in P3) */
    description: z.string().nullable(),
    category: breadcrumbDTO,
    breadcrumbs: z.array(breadcrumbDTO),
    images: z.array(imageDTO),
    options: z.array(productOptionDTO),
    variants: z.array(productVariantDTO),
    /** the variant pre-selected on load (cheapest in stock, else first) */
    defaultVariantId: uuid,
    price: halalas,
    compareAtPrice: halalas.nullable(),
    priceFrom: z.boolean(),
    stockLevel,
    isFeatured: z.boolean(),
    ratingAvg: z.string(),
    ratingCount: z.number().int().nonnegative(),
    /** null = sold by Souq AlZal itself (D6). The UI says "ينفّذه متجر …" (D21) */
    vendor: publicVendorDTO.nullable(),
    seo: z.object({ title: z.string(), description: z.string().nullable() }).strict(),
    related: z.array(productCardDTO),
    updatedAt: isoDate,
  })
  .strict();
export type ProductDetailDTO = z.infer<typeof productDetailDTO>;

// ------------------------------------------------------------------ bundle page (/bundles/[slug])
export const bundleDetailDTO = bundleCardDTO
  .extend({
    items: z.array(
      z
        .object({
          qty: z.number().int().positive(),
          variantId: uuid,
          /** "أسود / مقاس 56" — option values joined in option order, "" without options */
          optionsLabel: z.string(),
          product: z.object({ slug: z.string(), name: z.string(), image: imageDTO.nullable() }).strict(),
          unitPrice: halalas,
          available: z.boolean(),
        })
        .strict(),
    ),
    /** how many bundles can be bought at once (limited by the scarcest item) */
    maxQty: z.number().int().nonnegative(),
  })
  .strict();
export type BundleDetailDTO = z.infer<typeof bundleDetailDTO>;

// ------------------------------------------------------------------ search (/search?q=)
/** Arabic-normalised full-text search (SPEC 7.1: أ إ آ ← ا، ة ← ه، ى ← ي، no tashkeel). */
export const searchInput = z
  .object({
    locale: locale.default("ar"),
    q: z.string().trim().min(1).max(80),
    sort: productSort.default("featured"),
    page: z.number().int().min(1).max(500).default(1),
    perPage: z.number().int().min(1).max(48).default(24),
  })
  .strict();
export type SearchInput = z.input<typeof searchInput>;

export const searchResultDTO = paged(productCardDTO)
  .extend({
    q: z.string(),
    /** what was actually searched (normalised), for "نتائج البحث عن …" debugging */
    normalized: z.string(),
    categories: z.array(breadcrumbDTO),
  })
  .strict();
export type SearchResultDTO = z.infer<typeof searchResultDTO>;

export const searchSuggestInput = z
  .object({ locale: locale.default("ar"), q: z.string().trim().min(1).max(80) })
  .strict();
export const searchSuggestDTO = z
  .object({
    products: z.array(
      z.object({ slug: z.string(), name: z.string(), image: imageDTO.nullable(), price: halalas }).strict(),
    ),
    categories: z.array(breadcrumbDTO),
  })
  .strict();
export type SearchSuggestDTO = z.infer<typeof searchSuggestDTO>;
