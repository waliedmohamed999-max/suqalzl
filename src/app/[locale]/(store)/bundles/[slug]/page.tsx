import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { BnplLine } from "@/components/store/bnpl-line";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { JsonLd } from "@/components/store/json-ld";
import { DiscountBadge, Money, Price, discountPercent } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import { Callout } from "@/components/ui/callout";
import { addToCartAction } from "@/features/cart/actions";
import { getBundle } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import { NotFoundError } from "@/lib/db";
import { toDecimalString } from "@/lib/format/money";
import { absoluteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const revalidate = 300;

const load = cache(async (slug: string, locale: string) => {
  try {
    return await getBundle(slug, locale === "en" ? "en" : "ar");
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const b = await load(slug, locale);
  if (!b) return {};
  return { title: b.name, alternates: { canonical: absoluteUrl(`/bundles/${b.slug}`, locale) } };
}

/**
 * /bundles/[slug] (Bundle-mobile / Bundle-desktop): image, name, bundle price vs. the items'
 * value ("توفّر", both from the server), the items list with links, and one add-to-cart for the
 * bundle. The saving shown is itemsValue − price, both integer halalas from the DTO (display only).
 */
export default async function BundlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const b = await load(slug, locale);
  if (!b) notFound();
  const t = await getTranslations("bundle");
  const compare = b.compareAtPrice ?? b.itemsValue;
  const pct = discountPercent(b.price, compare);
  const saving = compare != null && compare > b.price ? compare - b.price : null;
  const available = b.inStock && b.maxQty > 0;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ name: b.name, href: `/bundles/${b.slug}` }]} locale={locale} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <ProductImage image={b.image} sizes="(min-width: 1024px) 600px, 100vw" priority className="lg:rounded-lg" />
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-gold-text">{t("eyebrow")}</p>
            <h1 className="text-[22px] leading-[1.45] font-bold lg:text-[28px]">{b.name}</h1>
            <p className="text-sm text-muted-foreground">{t("itemsCount", { count: b.itemCount })}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <Price halalas={b.price} compareAt={compare} size="lg" />
              {pct ? <DiscountBadge percent={pct} /> : null}
            </div>
            {b.itemsValue != null ? (
              <p className="flex justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{t("itemsValue")}</span>
                <Money halalas={b.itemsValue} />
              </p>
            ) : null}
            {saving ? (
              <p className="flex justify-between gap-2 text-sm font-bold text-success">
                <span>{t("save")}</span>
                <Money halalas={saving} />
              </p>
            ) : null}
          </div>
          {available ? null : <Callout tone="warning" title={t("unavailable")} />}
          <AddToCartButton
            action={addToCartAction}
            bundleId={b.id}
            size="lg"
            disabled={!available}
            label={t("add")}
            className="w-full"
          />
          <BnplLine />
          <section aria-labelledby="contains" className="flex flex-col gap-3">
            <h2 id="contains" className="text-lg font-bold">
              {t("contains")}
            </h2>
            <ul role="list" className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
              {b.items.map((it) => (
                <li key={it.variantId} className="flex items-center gap-3 p-3">
                  <span className="w-14 shrink-0">
                    <ProductImage image={it.product.image} sizes="56px" className="rounded-sm" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={`/p/${it.product.slug}`} className="text-sm font-semibold hover:underline">
                      {it.product.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {it.optionsLabel ? `${it.optionsLabel} · ` : ""}
                      {t("qty", { qty: it.qty })}
                    </span>
                    {!it.available ? (
                      <span className="text-xs font-semibold text-danger">{t("itemUnavailable")}</span>
                    ) : null}
                  </span>
                  <span className="text-sm">
                    <span className="sr-only">{t("unitPrice")} </span>
                    <Money halalas={it.unitPrice} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: b.name,
          image: b.image ? [absoluteUrl(b.image.url, "ar")] : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "SAR",
            price: toDecimalString(b.price),
            availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: absoluteUrl(`/bundles/${b.slug}`, locale),
          },
        }}
      />
    </div>
  );
}
