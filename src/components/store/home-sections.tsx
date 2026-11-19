import { BadgeCheck, ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Ornament } from "./logo";
import { ProductImage } from "./product-image";
import type { ImageVM } from "./types";

export interface HeroBannerVM {
  id: string;
  title: string | null;
  href: string | null;
  imageMobile: ImageVM;
  imageDesktop: ImageVM;
}

/**
 * Home hero (Home-mobile / Home-desktop): dark band, text + side image (16:11 mobile, 5:4 desktop,
 * review 4.1-5). Shows the first active banner; the others are listed as links under it (no
 * autoplay carousel: nothing moves on its own, and every banner stays reachable by keyboard).
 * The image is the page LCP → priority.
 */
export function HomeHero({ banners }: { banners: HeroBannerVM[] }) {
  const t = useTranslations("home");
  const [first, ...rest] = banners;
  if (!first) return null;
  const title = first.title ?? t("heroFallbackTitle");
  return (
    <section aria-labelledby="hero-title" data-surface="inverse" className="-mx-4 md:-mx-6 lg:-mx-8">
      <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 py-6 md:px-6 lg:min-h-[480px] lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-12">
        <div className="order-2 flex flex-col gap-4 lg:order-1 lg:gap-5">
          <Ornament className="hidden lg:flex" />
          <h1 id="hero-title" className="text-[28px] leading-10 font-bold lg:text-4xl lg:leading-[3.25rem]">
            {title}
          </h1>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {first.href ? (
              <Button asChild variant="gold" size="lg" className="flex-1 lg:flex-none">
                <Link href={first.href}>{t("heroCta")}</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="lg">
              <Link href="/products">{t("allProducts")}</Link>
            </Button>
          </div>
          {rest.length ? (
            <ul className="flex flex-wrap gap-2" aria-label={t("moreBanners")}>
              {rest.map((b) =>
                b.href && b.title ? (
                  <li key={b.id}>
                    <Link
                      href={b.href}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3.5 text-sm"
                    >
                      {b.title}
                      <ChevronRight aria-hidden="true" data-directional="" className="size-4" />
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </div>
        <div className="order-1 w-full lg:order-2 lg:max-w-[520px] lg:justify-self-center">
          <div className="lg:hidden">
            <ProductImage image={first.imageMobile} ratio="none" className="aspect-[16/11]" sizes="100vw" priority />
          </div>
          <div className="hidden lg:block">
            <ProductImage image={first.imageDesktop} ratio="none" className="aspect-[5/4] rounded-lg" sizes="520px" />
          </div>
        </div>
      </div>
    </section>
  );
}

export interface CategoryTileVM {
  slug: string;
  name: string;
  image: ImageVM | null;
}

/** "تسوّق حسب التصنيف": 4 columns on mobile, 8 on desktop, square tiles. */
export function CategoryTiles({ categories }: { categories: CategoryTileVM[] }) {
  const t = useTranslations("home");
  if (!categories.length) return null;
  return (
    <section aria-labelledby="cats-title" className="flex flex-col gap-4">
      <h2 id="cats-title" className="text-xl font-bold lg:text-2xl">
        {t("byCategory")}
      </h2>
      <ul role="list" className="grid grid-cols-4 gap-x-2.5 gap-y-3 lg:grid-cols-8 lg:gap-4">
        {categories.map((c) => (
          <li key={c.slug} className="min-w-0">
            <Link href={`/c/${c.slug}`} className="flex flex-col items-center gap-1.5 text-center text-foreground">
              <ProductImage image={c.image} ratio="square" sizes="(min-width: 1024px) 140px, 25vw" />
              <span className="text-xs leading-[18px] font-semibold lg:text-sm">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Trust strip (Home): payment, delivery, verified stores, returns. Static copy from messages. */
export function TrustStrip() {
  const t = useTranslations("home.trust");
  const items = [
    { icon: ShieldCheck, key: "pay" },
    { icon: Truck, key: "ship" },
    { icon: BadgeCheck, key: "vendors" },
    { icon: RotateCcw, key: "returns" },
  ] as const;
  return (
    <section aria-label={t("label")} className="rounded-lg bg-muted p-5 lg:p-8">
      <ul role="list" className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-4 lg:gap-5">
        {items.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-start gap-2.5">
            <Icon aria-hidden="true" className="size-6 shrink-0 text-gold-text" />
            <span className="flex flex-col">
              <strong className="text-sm">{t(`${key}.title`)}</strong>
              <span className="text-sm leading-5 text-muted-foreground">{t(`${key}.body`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "ابدأ البيع معنا" card (Home). */
export function SellCta() {
  const t = useTranslations("home.sell");
  return (
    <section
      aria-labelledby="sell-title"
      className="flex flex-col gap-2.5 rounded-lg border border-gold bg-card p-5 lg:p-7"
    >
      <Ornament />
      <h2 id="sell-title" className="text-lg font-bold">
        {t("title")}
      </h2>
      <p className="text-sm leading-[22px] text-muted-foreground">{t("body")}</p>
      <div>
        <Button asChild variant="secondary">
          <Link href="/sell">{t("cta")}</Link>
        </Button>
      </div>
    </section>
  );
}
