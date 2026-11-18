import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function VendorHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vendor");
  return <h1 className="text-2xl font-bold">{t("title")}</h1>;
}
