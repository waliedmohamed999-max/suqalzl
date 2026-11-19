import { X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { addToCartAction } from "@/features/cart/actions";
import type { ProductCardDTO } from "@/features/catalog/schema";
import { Link } from "@/i18n/navigation";
import { formatSAR, type MoneyLocale } from "@/lib/format/money";
import { AddToCartButton } from "./add-to-cart-button";
import {
  CatalogProvider,
  CatalogResults,
  FilterAside,
  FilterSheet,
  SortSelect,
  type CatalogFacetsVM,
} from "./catalog-controls";
import { activeFilterCount, catalogHref, clearedFilters, type CatalogQuery } from "./catalog-url";
import { toCardVM } from "./mappers";
import { Pagination } from "./pagination";
import { ProductCard, ProductGrid } from "./product-card";

/** Renders a list of product cards with the add-to-cart island for single-variant products. */
export async function ProductCards({
  products,
  priorityFirst,
}: {
  products: ProductCardDTO[];
  priorityFirst?: boolean;
}) {
  const t = await getTranslations("catalog.card");
  return products.map((p, i) => {
    const vm = toCardVM(p);
    return (
      <li key={p.id} className="flex">
        <ProductCard
          product={vm}
          priority={priorityFirst && i === 0}
          addToCart={
            vm.defaultVariantId ? (
              <AddToCartButton
                action={addToCartAction}
                variantId={vm.defaultVariantId}
                accessibleName={t("addToCartNamed", { name: vm.name })}
                className="mt-auto w-full text-sm"
              />
            ) : undefined
          }
        />
      </li>
    );
  });
}

/**
 * Category / all products / search results (Category-mobile, Category-desktop, Search-*):
 * title block, toolbar (filter sheet on mobile, sort), applied filter chips as removable links,
 * the grid with the desktop filter column, pagination, and the empty states. Page = Server
 * Component; only the controls are client islands (review 3.4).
 */
export async function CatalogListing({
  path,
  query,
  title,
  subtitle,
  above,
  facets,
  products,
  page,
  perPage,
  total,
  emptyCategory,
}: {
  path: string;
  query: CatalogQuery;
  title: ReactNode;
  subtitle?: ReactNode;
  above?: ReactNode;
  facets: CatalogFacetsVM | null;
  products: ProductCardDTO[];
  page: number;
  perPage: number;
  total: number;
  emptyCategory?: { title: string; body: string };
}) {
  const t = await getTranslations("catalog");
  const locale = (await getLocale()) as MoneyLocale;
  const filtered = activeFilterCount(query) > 0;
  const chips: { key: string; label: string; href: string }[] = [];
  if (query.priceMin != null || query.priceMax != null) {
    const fmt = (h: number) => formatSAR(h, { locale });
    const range =
      query.priceMin != null && query.priceMax != null
        ? `${fmt(query.priceMin)} – ${fmt(query.priceMax)}`
        : query.priceMin != null
          ? t("filters.priceFrom", { value: fmt(query.priceMin) })
          : t("filters.priceTo", { value: fmt(query.priceMax as number) });
    chips.push({
      key: "price",
      label: t("filters.priceChip", { range }),
      href: catalogHref(path, { ...query, priceMin: undefined, priceMax: undefined, page: 1 }),
    });
  }
  if (query.vendor) {
    const v = facets?.vendors.find((x) => x.slug === query.vendor);
    chips.push({
      key: "vendor",
      label: v?.name ?? query.vendor,
      href: catalogHref(path, { ...query, vendor: undefined, page: 1 }),
    });
  }
  if (query.onSale)
    chips.push({
      key: "sale",
      label: t("filters.onSale"),
      href: catalogHref(path, { ...query, onSale: false, page: 1 }),
    });
  if (query.inStock)
    chips.push({
      key: "stock",
      label: t("filters.inStock"),
      href: catalogHref(path, { ...query, inStock: false, page: 1 }),
    });

  const queryRecord = Object.fromEntries(
    Object.entries({
      q: query.q,
      priceMin: query.priceMin?.toString(),
      priceMax: query.priceMax?.toString(),
      vendor: query.vendor,
      onSale: query.onSale ? "1" : undefined,
      inStock: query.inStock ? "1" : undefined,
      sort: query.sort !== "featured" ? query.sort : undefined,
    }).filter(([, v]) => v),
  ) as Record<string, string>;

  return (
    <CatalogProvider path={path}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-[38px] font-bold lg:text-[32px]">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground lg:text-base">{subtitle}</p> : null}
        </div>
        {above}
        <div className="sticky top-0 z-[var(--z-sticky)] -mx-4 flex gap-2 border-b border-border bg-background px-4 py-2 md:-mx-6 md:px-6 lg:static lg:mx-0 lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          {facets ? <FilterSheet facets={facets} query={query} activeCount={activeFilterCount(query)} /> : null}
          <SortSelect query={query} id="sort" />
        </div>
        {chips.length ? (
          <div className="flex flex-col gap-2">
            <h2 className="sr-only">{t("filters.applied")}</h2>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              {chips.map((c) => (
                <li key={c.key} className="shrink-0">
                  <Link
                    href={c.href}
                    scroll={false}
                    aria-label={t("filters.remove", { label: c.label })}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong bg-card px-3.5 text-sm font-semibold"
                  >
                    {c.label}
                    <X aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              ))}
              <li className="shrink-0">
                <Link
                  href={catalogHref(path, clearedFilters(query))}
                  scroll={false}
                  className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-link underline"
                >
                  {t("filters.clearAll")}
                </Link>
              </li>
            </ul>
          </div>
        ) : null}

        <div className="flex items-start gap-8">
          {facets ? <FilterAside facets={facets} query={query} /> : null}
          <div className="min-w-0 flex-1">
            <CatalogResults>
              {products.length ? (
                <>
                  <p className="sr-only" role="status">
                    {t("resultsCount", { count: total })}
                  </p>
                  <ProductGrid withFilters={!!facets}>
                    <ProductCards products={products} priorityFirst />
                  </ProductGrid>
                  <Pagination path={path} query={queryRecord} page={page} pageSize={perPage} total={total} />
                </>
              ) : filtered ? (
                <EmptyState
                  variant="filtered"
                  title={t("filters.noResultsTitle")}
                  body={t("filters.noResultsBody")}
                  action={
                    <Button asChild>
                      <Link href={catalogHref(path, clearedFilters(query))}>{t("filters.removeAll")}</Link>
                    </Button>
                  }
                  className="rounded-lg bg-card"
                />
              ) : (
                <EmptyState
                  title={emptyCategory?.title ?? t("emptyCategoryTitle")}
                  body={emptyCategory?.body ?? t("emptyCategoryBody")}
                  action={
                    <Button asChild>
                      <Link href="/products">{t("browseAll")}</Link>
                    </Button>
                  }
                  className="rounded-lg bg-card"
                />
              )}
            </CatalogResults>
          </div>
        </div>
      </div>
    </CatalogProvider>
  );
}
