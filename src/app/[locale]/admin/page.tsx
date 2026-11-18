import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/dash/dash-shell";

/** KPIs, queues and charts arrive with their DTOs in P3 (no placeholder data, CLAUDE.md rule 7). */
export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return <PageHeader title={t("title")} />;
}
