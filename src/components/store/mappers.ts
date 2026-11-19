import type { ProductCardDTO } from "@/features/catalog/schema";
import type { CatalogQuery, CatalogSort } from "./catalog-url";
import type { ProductCardVM } from "./types";

/** ProductCardDTO (backend contract) -> the card's view model. */
export function toCardVM(p: ProductCardDTO): ProductCardVM {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.image,
    price: p.price,
    compareAt: p.compareAtPrice,
    isRange: p.priceFrom,
    available: p.stockLevel !== "OUT",
    lowStock: p.stockLevel === "LOW",
    defaultVariantId: p.hasOptions ? null : p.defaultVariantId,
    hasOptions: p.hasOptions,
    vendorName: p.vendor?.name ?? null,
  };
}

/** Normalised list input (parseProductListParams) -> the controls' query shape. */
export function toCatalogQuery(
  i: {
    priceMin?: number;
    priceMax?: number;
    vendor?: string;
    onSale: boolean;
    inStock: boolean;
    sort: string;
    page: number;
  },
  q?: string,
): CatalogQuery {
  return {
    q,
    priceMin: i.priceMin,
    priceMax: i.priceMax,
    vendor: i.vendor,
    onSale: i.onSale,
    inStock: i.inStock,
    sort: i.sort as CatalogSort,
    page: i.page,
  };
}
