import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Link } from "@/i18n/navigation";

/** 404 (SPEC 7.1: Arabic 404/500 pages). Rendered inside the locale layout. */
export default function NotFound() {
  const t = useTranslations("states");
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 flex-col">
      <ErrorState
        variant="page"
        title={t("notFoundTitle")}
        body={t("notFoundBody")}
        action={
          <Button asChild size="lg">
            <Link href="/">{t("goHome")}</Link>
          </Button>
        }
      />
    </main>
  );
}
