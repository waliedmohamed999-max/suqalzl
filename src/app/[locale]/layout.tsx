import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { dirOf, routing } from "@/i18n/routing";
import { fontClassNames } from "../fonts";
import "../globals.css";

// Empty on purpose: nothing under [locale] is prerendered at build time (CI and build
// environments have no database). An empty list (not a missing export) keeps pages with
// `revalidate` as ISR: rendered on the first request, then served from the cache.
// Unknown locales still 404 (hasLocale below).
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("defaultTitle"), template: `%s | ${t("defaultTitle")}` },
    description: t("defaultDescription"),
  };
}

/**
 * Root layout (tokens.md 8.1): <html lang dir> from the locale, fonts from next/font/local
 * (tokens.md 9.2, src/app/fonts.ts), skip link, and the single toast region.
 * The skip link is always `fixed` inside the viewport's inline size and parked ABOVE the top edge
 * until focused (overflow upwards is never scrollable). `sr-only` + `start-0` left a 1px box past
 * the inline edge (its -1px margin), which overflow checks at 390px reported.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });
  const dir = dirOf(locale);
  return (
    <html lang={locale} dir={dir} className={fontClassNames}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="fixed start-2 top-2 z-[var(--z-toast)] -translate-y-[calc(100%+1rem)] rounded-md bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          {children}
          <Toaster dir={dir} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
