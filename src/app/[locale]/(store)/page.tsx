import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("store");
  // Home sections come from HomeSection in P2-01; no placeholder data here (CLAUDE.md rule 7).
  return <h1 className="text-2xl font-bold">{t("homeTitle")}</h1>;
}
