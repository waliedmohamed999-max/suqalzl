"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Link } from "@/i18n/navigation";

/**
 * 500 for every route under [locale] (SPEC 7.1). Shows what happened and what to do, never the
 * error message; the digest lets support find the server log / Sentry event.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("states");
  const tc = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 flex-col">
      <ErrorState
        variant="page"
        title={t("errorTitle")}
        body={t("errorBody")}
        action={
          <>
            <Button size="lg" onClick={reset}>
              <RefreshCw aria-hidden="true" />
              {tc("retry")}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">{t("goHome")}</Link>
            </Button>
          </>
        }
        footer={error.digest ? <bdi dir="ltr">{t("errorCode", { digest: error.digest })}</bdi> : null}
      />
    </main>
  );
}
