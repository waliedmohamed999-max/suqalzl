import { BadgeCheck, ChevronRight, RotateCcw, ShieldCheck, Star, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { BnplLine } from "@/components/store/bnpl-line";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductCards } from "@/components/store/catalog-listing";
import { JsonLd } from "@/components/store/json-ld";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { SectionHeading } from "@/components/store/section-heading";
import { addToCartAction } from "@/features/cart/actions";
import { getProduct } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import { NotFoundError } from "@/lib/db";
import { toDecimalString } from "@/lib/format/money";
import { absoluteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string; slug: string }> };

/** ISR (review 2.2): no cookies; the user-specific parts are islands. */
export const revalidate = 300;

const load = cache(async (slug: string, locale: string) => {
  try {
    return await getProduct(slug, locale === "en" ? "en" : "ar");
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await load(slug, locale);
  if (!p) return {};
  const url = absoluteUrl(`/p/${p.slug}`, locale);
  const image = p.images[0] ? absoluteUrl(p.images[0].url, "ar") : undefined;
  return {
    title: p.seo.title,
    description: p.seo.description ?? undefined,
    alternates: {
      canonical: url,
      languages: { ar: absoluteUrl(`/p/${p.slug}`, "ar"), en: absoluteUrl(`/p/${p.slug}`, "en") },
    },
    openGraph: {
      type: "website",
      url,
      title: p.seo.title,
      description: p.seo.description ?? undefined,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * /p/[slug] (Product-mobile, Product-mobile-en, Product-desktop): gallery 4:5, title + rating,
 * "sold by" block (platform or "ينفّذه متجر …", D21/O8 with PublicVendorDTO only), the purchase
 * island (options, price, stock, qty, add to cart, sticky bar on mobile), the installments line
 * for every visitor (D32), shipping/returns notes, description, related products, and JSON-LD
 * Product + BreadcrumbList. "اطلب سعرك" joins in P4.5.
 */
export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await load(slug, locale);
  if (!p) notFound();
  const t = await getTranslations("product");
  const tc = await getTranslations("common");
  const crumbs = [
    ...p.breadcrumbs.map((b) => ({ name: b.name, href: `/c/${b.slug}` })),
    { name: p.name, href: `/p/${p.slug}` },
  ];
  const rating = Number(p.ratingAvg);
  const vendorName = p.vendor ? (locale === "en" ? p.vendor.storeNameEn : p.vendor.storeNameAr) : null;
  const paragraphs = (p.description ?? "")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const inStockVariants = p.variants.filter((v) => v.stockLevel !== "OUT");

  return (
    <div className="flex flex-col gap-6 lg:gap-10">
      <Breadcrumbs items={crumbs} locale={locale} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div className="-mx-4 md:-mx-6 lg:mx-0">
          <ProductGallery images={p.images} name={p.name} />
        </div>
        <div className="flex flex-col gap-5 lg:sticky lg:top-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[22px] leading-[1.45] font-bold lg:text-[28px]">{p.name}</h1>
            {p.ratingCount > 0 ? (
              <p className="flex items-center gap-1.5 text-sm">
                <Star aria-hidden="true" className="size-4 fill-current text-gold-text" />
                <span className="font-semibold">{t("rating", { rating: p.ratingAvg })}</span>
                <span className="text-muted-foreground">· {t("ratingCount", { count: p.ratingCount })}</span>
              </p>
            ) : null}
          </div>

          {p.vendor ? (
            <div className="flex items-center gap-2.5 rounded-md border border-border p-3">
              <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-full bg-muted">
                <Store className="size-5" />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-semibold">{t("fulfilledBy", { name: vendorName ?? "" })}</span>
                {p.vendor.ratingCount > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {t("vendorRating", { rating: p.vendor.ratingAvg })}
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-md border border-border p-3">
              <span
                data-surface="inverse-strong"
                aria-hidden="true"
                className="inline-flex size-9 items-center justify-center rounded-full"
              >
                <BadgeCheck className="size-5 text-gold" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{t("soldByPlatform")}</span>
                <span className="text-xs text-muted-foreground">{t("platformNote")}</span>
              </span>
            </div>
          )}

          <ProductPurchase
            name={p.name}
            options={p.options}
            variants={p.variants}
            defaultVariantId={p.defaultVariantId}
            addToCart={addToCartAction}
          />
          <BnplLine />

          <ul className="flex flex-col gap-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <Truck aria-hidden="true" className="size-5 shrink-0 text-foreground-secondary" />
              {t("shippingBody")}
            </li>
            <li className="flex items-start gap-2.5">
              <RotateCcw aria-hidden="true" className="size-5 shrink-0 text-foreground-secondary" />
              <span>
                {t.rich("returnsBody", {
                  link: (c) => (
                    <Link href="/pages/returns" className="text-link underline">
                      {c}
                    </Link>
                  ),
                })}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-foreground-secondary" />
              {t("securePay")}
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-3xl divide-y divide-border border-y border-border">
        <details open className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-base font-bold [&::-webkit-details-marker]:hidden">
            <h2>{t("description")}</h2>
            <ChevronRight
              aria-hidden="true"
              className="size-5 rotate-90 text-muted-foreground transition-transform group-open:-rotate-90"
            />
          </summary>
          <div className="flex flex-col gap-3 pb-4 text-base leading-7 text-foreground-secondary">
            {paragraphs.length ? paragraphs.map((para, i) => <p key={i}>{para}</p>) : <p>{t("noDescription")}</p>}
          </div>
        </details>
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-base font-bold [&::-webkit-details-marker]:hidden">
            <h2>{t("shippingReturns")}</h2>
            <ChevronRight
              aria-hidden="true"
              className="size-5 rotate-90 text-muted-foreground transition-transform group-open:-rotate-90"
            />
          </summary>
          <div className="flex flex-col gap-2 pb-4 text-base leading-7 text-foreground-secondary">
            <p>{t("shippingBody")}</p>
            <p>
              {t.rich("returnsBody", {
                link: (c) => (
                  <Link href="/pages/returns" className="text-link underline">
                    {c}
                  </Link>
                ),
              })}
            </p>
          </div>
        </details>
      </div>

      {p.related.length ? (
        <section aria-labelledby="related" className="flex flex-col gap-4 pb-20 lg:pb-0">
          <SectionHeading id="related" title={t("related")} />
          <ProductGrid>
            <ProductCards products={p.related.slice(0, 4)} />
          </ProductGrid>
        </section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          sku: p.variants.find((v) => v.id === p.defaultVariantId)?.sku,
          description: p.seo.description ?? paragraphs[0],
          image: p.images.map((i) => absoluteUrl(i.url, "ar")),
          category: p.category.name,
          brand: { "@type": "Brand", name: vendorName ?? tc("siteName") },
          ...(p.ratingCount > 0 && Number.isFinite(rating)
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } }
            : {}),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "SAR",
            lowPrice: toDecimalString(Math.min(...p.variants.map((v) => v.price))),
            highPrice: toDecimalString(Math.max(...p.variants.map((v) => v.price))),
            offerCount: p.variants.length,
            availability: inStockVariants.length ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: absoluteUrl(`/p/${p.slug}`, locale),
          },
        }}
      />
    </div>
  );
}
