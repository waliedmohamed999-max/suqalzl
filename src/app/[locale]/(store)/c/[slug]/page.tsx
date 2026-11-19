import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogListing } from "@/components/store/catalog-listing";
import { toCatalogQuery } from "@/components/store/mappers";
import { listCategories, listProducts, parseProductListParams } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loc = (l: string) => (l === "en" ? "en" : "ar");

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const cats = await listCategories(loc(locale));
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return {};
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: cat.name,
    alternates: { canonical: absoluteUrl(`/c/${slug}`, locale) },
    // Filter/sort/page combinations are not indexed (one canonical page per category).
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

/** /c/[slug] (Category-mobile / Category-desktop): sub-categories as chips, then the listing. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const input = parseProductListParams(await searchParams, { locale: loc(locale), category: slug });
  const [cats, list] = await Promise.all([listCategories(loc(locale)), listProducts(input)]);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat || !list.category) notFound();
  const children = cats.filter((c) => c.parentSlug === slug);
  const parent = cat.parentSlug ? cats.find((c) => c.slug === cat.parentSlug) : null;
  const crumbs = list.category.breadcrumbs.map((b) => ({ name: b.name, href: `/c/${b.slug}` }));
  if (!crumbs.some((c) => c.href === `/c/${slug}`)) crumbs.push({ name: cat.name, href: `/c/${slug}` });

  const subs = children.length ? children : parent ? cats.filter((c) => c.parentSlug === parent.slug) : [];
  const allHref = parent && !children.length ? `/c/${parent.slug}` : `/c/${slug}`;
  const above = subs.length ? (
    <nav aria-label={t("subcategories")}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {[
          { slug: allHref.slice(3), name: t("all"), href: allHref },
          ...subs.map((c) => ({ ...c, href: `/c/${c.slug}` })),
        ].map((c) => {
          const active = c.href === `/c/${slug}`;
          return (
            <li key={c.href} className="shrink-0">
              <Link
                href={c.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-foreground",
                )}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      <Breadcrumbs items={crumbs} locale={locale} />
      <CatalogListing
        path={`/c/${slug}`}
        query={toCatalogQuery(input)}
        title={cat.name}
        subtitle={t("resultsCount", { count: list.total })}
        above={above}
        facets={{ priceRange: list.facets.priceRange, vendors: list.facets.vendors }}
        products={list.items}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
      />
    </div>
  );
}
