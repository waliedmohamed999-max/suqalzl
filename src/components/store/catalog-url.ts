/**
 * Catalogue filters -> URL for the client controls and the server links (chips, pagination).
 * Param names follow the backend contract `parseProductListParams` (src/features/catalog/schema.ts):
 * priceMin / priceMax (HALALAS), vendor (one slug; "souq" = the platform), onSale, inStock, sort,
 * page, plus q on /search. The server re-validates everything. The inputs show whole riyals and
 * convert with integer arithmetic only (D7).
 */
export const SORTS = ["featured", "newest", "price_asc", "price_desc", "best_selling"] as const;
export type CatalogSort = (typeof SORTS)[number];

export interface CatalogQuery {
  q?: string;
  priceMin?: number;
  priceMax?: number;
  vendor?: string;
  onSale: boolean;
  inStock: boolean;
  sort: CatalogSort;
  page: number;
}

export function catalogQueryRecord(q: CatalogQuery): Record<string, string | undefined> {
  return {
    q: q.q || undefined,
    priceMin: q.priceMin != null ? String(q.priceMin) : undefined,
    priceMax: q.priceMax != null ? String(q.priceMax) : undefined,
    vendor: q.vendor || undefined,
    onSale: q.onSale ? "1" : undefined,
    inStock: q.inStock ? "1" : undefined,
    sort: q.sort !== "featured" ? q.sort : undefined,
    page: q.page > 1 ? String(q.page) : undefined,
  };
}

export function catalogHref(path: string, q: CatalogQuery): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(catalogQueryRecord(q))) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}

export function activeFilterCount(q: CatalogQuery): number {
  return (
    (q.priceMin != null || q.priceMax != null ? 1 : 0) + (q.vendor ? 1 : 0) + (q.onSale ? 1 : 0) + (q.inStock ? 1 : 0)
  );
}

export function clearedFilters(q: CatalogQuery): CatalogQuery {
  return { ...q, priceMin: undefined, priceMax: undefined, vendor: undefined, onSale: false, inStock: false, page: 1 };
}

/** Whole riyals typed by the customer -> halalas (integer only, D7). */
export function riyalsToHalalas(input: string): number | undefined {
  const s = input.trim();
  if (!/^\d{1,7}$/.test(s)) return undefined;
  return Number(s) * 100;
}

/** Halalas -> whole riyals for an input value (inputs are whole riyals). */
export function halalasToRiyalsInput(h: number | undefined | null): string {
  return h == null ? "" : String(Math.floor(h / 100));
}
