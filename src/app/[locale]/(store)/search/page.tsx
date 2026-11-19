import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogListing } from "@/components/store/catalog-listing";
import { SORTS, type CatalogSort } from "@/components/store/catalog-url";
import { SearchBox } from "@/components/store/search-box";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { searchProducts } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  const q = one((await searchParams).q)?.trim();
  // Search result pages are never indexed.
  return { title: q ? t("metaTitle", { q: q.slice(0, 80) }) : t("title"), robots: { index: false, follow: true } };
}

/**
 * /search?q= (Search-mobile / Search-desktop / Search-states): results with sort and pages, the
 * "before typing" state, and "no results" with matching categories when any. Arabic
 * normalisation (أ/إ/آ، ة/ه، ى/ي، tashkeel) is done by the backend.
 */
export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 80) ?? "";
  const sortRaw = one(sp.sort);
  const sort: CatalogSort = SORTS.includes(sortRaw as CatalogSort) ? (sortRaw as CatalogSort) : "featured";
  const pageRaw = one(sp.page);
  const page = pageRaw && /^\d{1,3}$/.test(pageRaw) && Number(pageRaw) > 0 ? Number(pageRaw) : 1;

  if (!q) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <SearchBox
          action={locale === "en" ? "/en/search" : "/search"}
          id="q-page"
          className="[&_label]:border [&_label]:border-input"
        />
        <EmptyState
          variant="search"
          title={t("promptTitle")}
          body={t("promptBody")}
          action={
            <Button asChild variant="secondary">
              <Link href="/products">{t("browseAll")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const res = await searchProducts({ locale: locale === "en" ? "en" : "ar", q, sort, page });
  const cats = res.categories.length ? (
    <nav aria-label={t("categories")} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{t("categories")}</h2>
      <ul className="flex flex-wrap gap-2">
        {res.categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/c/${c.slug}`}
              className="inline-flex min-h-11 items-center rounded-full border border-input bg-card px-4 text-sm font-semibold"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  ) : null;

  return (
    <CatalogListing
      path="/search"
      query={{ q, sort, page, onSale: false, inStock: false }}
      title={t("resultsFor", { q })}
      subtitle={t("count", { count: res.total })}
      above={cats}
      facets={null}
      products={res.items}
      page={res.page}
      perPage={res.perPage}
      total={res.total}
      emptyCategory={{ title: t("emptyTitle", { q }), body: t("emptyBody") }}
    />
  );
}
