import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/dash/dash-shell";

/** Sales, balances and the onboarding checklist arrive with their DTOs in P4 (CLAUDE.md rule 7). */
export default async function VendorHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vendor");
  return <PageHeader title={t("title")} />;
}
