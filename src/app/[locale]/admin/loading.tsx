import { useTranslations } from "next-intl";
import { AdminPageSkeleton } from "@/components/admin/states";

/** Shown while an admin page's data loads (same rhythm as the list rows). */
export default function AdminLoading() {
  const t = useTranslations("admin.states");
  return <AdminPageSkeleton label={t("loading")} />;
}
