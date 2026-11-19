"use client";

import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { postJson } from "@/features/auth/client";

/** Customer sign-out: POST /api/auth/logout (session revoked server-side), then the store home. */
export function CustomerLogout() {
  const t = useTranslations("accountArea.profile");
  const te = useTranslations("actionErrors");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await postJson("/api/auth/logout", {});
        if (r.ok) window.location.assign(locale === "en" ? "/en" : "/");
        else {
          setBusy(false);
          toast.error(te(r.code === "NETWORK" ? "NETWORK" : "INTERNAL"));
        }
      }}
      className="w-full"
    >
      <LogOut aria-hidden="true" data-directional="" />
      {t("logout")}
    </Button>
  );
}
