import type { ProductCardDTO } from "@/features/catalog/schema";
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
