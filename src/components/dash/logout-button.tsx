"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/toaster";
import { postJson } from "@/features/auth/client";

/** POST /api/auth/logout (revokes the session server-side), then a full load of the login page. */
export function LogoutButton() {
  const t = useTranslations("dash");
  const te = useTranslations("errors");
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={async () => {
        setBusy(true);
        const r = await postJson("/api/auth/logout", {});
        if (r.ok) window.location.assign("/staff/login");
        else {
          setBusy(false);
          toast.error(te(r.code === "NETWORK" ? "network" : "generic"));
        }
      }}
      className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground hover:bg-card disabled:cursor-wait"
    >
      <LogOut aria-hidden="true" data-directional="" className="size-5 text-muted-foreground" />
      {busy ? t("loggingOut") : t("logout")}
    </button>
  );
}
