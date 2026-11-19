"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

/** Load error inside the admin shell (Admin-states-p018 "خطأ في التحميل"): the sidebar stays usable. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("admin.states");
  const ts = useTranslations("states");
  const tc = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      className="py-16"
      title={t("loadErrorTitle")}
      body={t("loadErrorBody")}
      action={
        <Button onClick={reset}>
          <RefreshCw aria-hidden="true" />
          {tc("retry")}
        </Button>
      }
      footer={error.digest ? <bdi dir="ltr">{ts("errorCode", { digest: error.digest })}</bdi> : null}
    />
  );
}
