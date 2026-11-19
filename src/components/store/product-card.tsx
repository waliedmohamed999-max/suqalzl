import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { DiscountBadge, Price, discountPercent } from "./price";
import { ProductImage } from "./product-image";
import type { ProductCardVM } from "./types";

export const PRODUCT_CARD_SIZES = "(min-width: 1024px) 300px, (min-width: 768px) 33vw, 50vw";

/**
 * ProductCard (tokens.md 11.2, lib.py product_card): <article>, 4:5 image, discount or
 * "يقبل الفصال" badge, vendor line, name (2 lines reserved), price with compare-at, and the CTA:
 * add-to-cart island for single-variant products, otherwise a link "متوفر بعدة خيارات".
 * Server Component; `favorite` and `addToCart` are island slots so the card stays static.
 */
export function ProductCard({
  product,
  priority,
  favorite,
  addToCart,
  headingLevel = 3,
}: {
  product: ProductCardVM;
  priority?: boolean;
  favorite?: ReactNode;
  addToCart?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const t = useTranslations("catalog.card");
  const H = headingLevel === 2 ? "h2" : "h3";
  const href = `/p/${product.slug}`;
  const pct = discountPercent(product.price, product.compareAt);
  return (
    <article className="flex w-full min-w-0 flex-col gap-2.5">
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <ProductImage image={product.image} sizes={PRODUCT_CARD_SIZES} priority={priority} />
        </Link>
        <span className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {pct ? <DiscountBadge percent={pct} /> : null}
          {!product.available ? (
            <span className="inline-flex min-h-6 items-center rounded-sm bg-neutral px-2 text-xs font-semibold text-neutral-foreground">
              {t("soldOut")}
            </span>
          ) : null}
        </span>
        {favorite ? <span className="absolute end-1 top-1">{favorite}</span> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-xs text-muted-foreground">
          {product.vendorName ? t("byVendor", { name: product.vendorName }) : t("byPlatform")}
        </p>
        <H className="line-clamp-2 min-h-11 text-sm leading-[22px]">
          <Link href={href} className="text-foreground hover:underline">
            {product.name}
          </Link>
        </H>
        <Price
          halalas={product.price}
          compareAt={product.compareAt}
          variant={product.isRange ? "range" : "default"}
          size="sm"
          className="text-base"
        />
      </div>
      {product.available ? (
        product.defaultVariantId && addToCart ? (
          addToCart
        ) : (
          <Link
            href={href}
            className={cn(
              "mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground hover:bg-accent",
            )}
          >
            {product.hasOptions ? t("options") : t("view")}
            <ChevronRight aria-hidden="true" data-directional="" className="size-4" />
          </Link>
        )
      ) : null}
    </article>
  );
}

/** Grid per README 4.2: 2 columns (gap 12) → 3 at md (16) → 4 at lg (24); 3 with filters. */
export function ProductGrid({
  children,
  withFilters,
  className,
}: {
  children: ReactNode;
  withFilters?: boolean;
  className?: string;
}) {
  return (
    <ul
      role="list"
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4 lg:gap-x-6 lg:gap-y-8",
        withFilters ? "lg:grid-cols-3" : "lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </ul>
  );
}
