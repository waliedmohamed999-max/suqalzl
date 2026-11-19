/**
 * View models for the store components. Components take only what they render (implementation-
 * review 2.1: Client props are serialised into the RSC payload, so no wide DTOs). Pages map the
 * backend DTOs (src/features/<feature>/schema.ts) to these shapes. Money is integer halalas (D7).
 */
export interface ImageVM {
  url: string;
  alt: string;
}

export interface ProductCardVM {
  id: string;
  slug: string;
  name: string;
  image: ImageVM | null;
  /** Lowest active variant price (halalas, VAT inclusive). */
  price: number;
  compareAt: number | null;
  /** "من" before the price when variants have different prices. */
  isRange: boolean;
  available: boolean;
  lowStock: boolean;
  /** Direct add-to-cart only when the product has a single purchasable variant. */
  defaultVariantId: string | null;
  hasOptions: boolean;
  /** null = sold by the platform ("يُباع من سوق الزل"). */
  vendorName: string | null;
}

export interface CrumbVM {
  name: string;
  href: string;
}
