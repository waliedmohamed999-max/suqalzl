import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Markdown } from "@/components/store/markdown";
import { Callout } from "@/components/ui/callout";
import { getPage, listPages } from "@/features/pages/queries";
import { Link } from "@/i18n/navigation";
import { NotFoundError } from "@/lib/db";
import { formatDate } from "@/lib/format/date";
import { absoluteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const revalidate = 300;

const load = cache(async (slug: string, locale: string) => {
  try {
    return await getPage(slug, locale === "en" ? "en" : "ar");
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await load(slug, locale);
  if (!p) return {};
  return { title: p.title, alternates: { canonical: absoluteUrl(`/pages/${p.slug}`, locale) } };
}

/**
 * /pages/[slug] (Policy-mobile / Policy-desktop): title, last update, the Markdown body (safe
 * renderer, no raw HTML), and the other pages as a side list on desktop. Content = v0.2 drafts
 * from legal-contracts (seed) until the lawyer review (P8).
 */
export default async function PolicyPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [page, pages] = await Promise.all([load(slug, locale), listPages(locale === "en" ? "en" : "ar")]);
  if (!page) notFound();
  const t = await getTranslations("policy");
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs items={[{ name: page.title, href: `/pages/${page.slug}` }]} locale={locale} />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label={t("otherPages")} className="order-2 lg:sticky lg:top-4 lg:order-1">
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">{t("otherPages")}</h2>
          <ul className="flex flex-col">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/pages/${p.slug}`}
                  aria-current={p.slug === page.slug ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-md border-s-[3px] px-3 text-sm",
                    p.slug === page.slug
                      ? "border-border-strong bg-muted font-bold"
                      : "border-transparent hover:bg-accent",
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="order-1 flex max-w-3xl flex-col gap-4 rounded-lg bg-card p-5 lg:order-2 lg:p-8">
          <header className="flex flex-col gap-1">
            <h1 className="text-[26px] leading-[38px] font-bold lg:text-[32px]">{page.title}</h1>
            <p className="text-sm text-muted-foreground">
              {t("updated", { date: formatDate(page.updatedAt, locale) })}
            </p>
          </header>
          {page.fallbackLocale ? <Callout tone="info" title={t("fallback")} /> : null}
          <div dir={page.fallbackLocale ? "rtl" : undefined} lang={page.fallbackLocale ? "ar" : undefined}>
            <Markdown source={page.content} />
          </div>
        </article>
      </div>
    </div>
  );
}
