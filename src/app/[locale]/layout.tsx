import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { dirOf, routing } from "@/i18n/routing";
import { fontClassNames } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
          className="sr-only z-[var(--z-toast)] rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:start-2 focus:top-2"
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
