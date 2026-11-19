import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogListing } from "@/components/store/catalog-listing";
import { toCatalogQuery } from "@/components/store/mappers";
import { listProducts, parseProductListParams } from "@/features/catalog/queries";
import { absoluteUrl } from "@/lib/site-url";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: t("allProductsTitle"),
    description: t("allProductsDescription"),
    alternates: { canonical: absoluteUrl("/products", locale) },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

/** /products (Search-desktop "كل المنتجات"): every published product with the same filters. */
export default async function AllProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const input = parseProductListParams(await searchParams, { locale: locale === "en" ? "en" : "ar" });
  const list = await listProducts(input);
  return (
    <div className="flex flex-col gap-3">
      <Breadcrumbs items={[{ name: t("allProductsTitle"), href: "/products" }]} locale={locale} />
      <CatalogListing
        path="/products"
        query={toCatalogQuery(input)}
        title={t("allProductsTitle")}
        subtitle={t("resultsCount", { count: list.total })}
        facets={{ priceRange: list.facets.priceRange, vendors: list.facets.vendors }}
        products={list.items}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
      />
    </div>
  );
}
