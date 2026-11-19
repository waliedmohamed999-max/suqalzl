import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Link } from "@/i18n/navigation";

/** 404 inside the admin shell (unknown product id, order number, customer). */
export default function AdminNotFound() {
  const t = useTranslations("states");
  const ta = useTranslations("admin.states");
  return (
    <ErrorState
      className="py-16"
      title={t("notFoundTitle")}
      body={t("notFoundBody")}
      action={
        <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
          {ta("backHome")}
        </Link>
      }
    />
  );
}
