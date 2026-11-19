import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryTiles, HomeHero, SellCta, TrustStrip } from "@/components/store/home-sections";
import { ProductCards } from "@/components/store/catalog-listing";
import { Money } from "@/components/store/price";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { SectionHeading } from "@/components/store/section-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getHome } from "@/features/catalog/queries";
import type { BundleCardDTO, HomeSectionDTO } from "@/features/catalog/schema";
import { Link } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/site-url";

/** ISR: public data only, re-rendered at most every 5 minutes (admin edits revalidate by tag). */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: {
      canonical: absoluteUrl("/", locale),
      languages: { ar: absoluteUrl("/", "ar"), en: absoluteUrl("/", "en") },
    },
  };
}

function BundleCards({ bundles }: { bundles: BundleCardDTO[] }) {
  return bundles.map((b) => (
    <li key={b.id}>
      <article className="flex flex-col gap-2.5">
        <Link href={`/bundles/${b.slug}`} tabIndex={-1} aria-hidden="true">
          <ProductImage image={b.image} sizes="(min-width: 1024px) 300px, 50vw" />
        </Link>
        <h3 className="line-clamp-2 min-h-11 text-sm leading-[22px]">
          <Link href={`/bundles/${b.slug}`} className="hover:underline">
            {b.name}
          </Link>
        </h3>
        <span className="text-base font-bold">
          <Money halalas={b.price} />
        </span>
      </article>
    </li>
  ));
}

/**
 * Home (Home-mobile / Home-desktop): sections in the admin's HomeSection order (backend drops
 * empty ones), then the trust strip and the "sell with us" card. The flash-deals strip joins in
 * P4.5 (no deals in M1). No cookies here: the page stays static.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const home = await getHome(locale === "en" ? "en" : "ar");
  const hasHero = home.sections.some((s) => s.type === "BANNERS");

  const render = (s: HomeSectionDTO, index: number) => {
    switch (s.type) {
      case "BANNERS":
        return (
          <HomeHero
            key={s.id}
            banners={s.banners.map((b) => ({
              id: b.id,
              title: b.title,
              href: b.link,
              imageMobile: b.imageMobile,
              imageDesktop: b.imageDesktop,
            }))}
          />
        );
      case "CATEGORIES":
        return (
          <CategoryTiles
            key={s.id}
            categories={s.categories.map((c) => ({ slug: c.slug, name: c.name, image: c.image }))}
          />
        );
      case "FEATURED":
        return (
          <section key={s.id} aria-labelledby={`h-${s.id}`} className="flex flex-col gap-4">
            <SectionHeading
              id={`h-${s.id}`}
              eyebrow={t("featuredEyebrow")}
              title={t("featured")}
              link={{ href: "/products", label: t("viewAll") }}
            />
            <ProductGrid>
              <ProductCards products={s.products} priorityFirst={!hasHero && index === 0} />
            </ProductGrid>
          </section>
        );
      case "CATEGORY_PRODUCTS":
        return (
          <section key={s.id} aria-labelledby={`h-${s.id}`} className="flex flex-col gap-4">
            <SectionHeading
              id={`h-${s.id}`}
              title={s.category.name}
              link={{ href: `/c/${s.category.slug}`, label: t("viewAll") }}
            />
            <ProductGrid>
              <ProductCards products={s.products} />
            </ProductGrid>
          </section>
        );
      case "BUNDLES":
        return (
          <section key={s.id} aria-labelledby={`h-${s.id}`} className="flex flex-col gap-4">
            <SectionHeading id={`h-${s.id}`} eyebrow={t("bundlesEyebrow")} title={t("bundles")} />
            <ProductGrid>
              <BundleCards bundles={s.bundles} />
            </ProductGrid>
          </section>
        );
    }
  };

  return (
    <div className="flex flex-col gap-10 lg:gap-14">
      {!hasHero ? <h1 className="sr-only">{t("heroFallbackTitle")}</h1> : null}
      {home.sections.length ? (
        home.sections.map(render)
      ) : (
        <EmptyState
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/products">{t("allProducts")}</Link>
            </Button>
          }
        />
      )}
      <TrustStrip />
      <SellCta />
    </div>
  );
}
