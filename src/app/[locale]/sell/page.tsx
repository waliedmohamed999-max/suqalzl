import { getTranslations, setRequestLocale } from "next-intl/server";

/** Vendor onboarding (/sell) — P4-01. */
export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sell");
  return <h1 className="text-2xl font-bold">{t("title")}</h1>;
}
