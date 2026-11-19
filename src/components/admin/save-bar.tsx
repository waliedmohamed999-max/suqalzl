"use client";

import { Check, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * SaveBar (README 4.6): sticky region at the bottom, shown only while there are unsaved changes:
 * "عندك تغييرات غير محفوظة" + Discard / Save. Save is a submit button for the surrounding form.
 */
export function SaveBar({
  dirty,
  saving,
  onDiscard,
  formId,
  saveLabel,
}: {
  dirty: boolean;
  saving?: boolean;
  onDiscard: () => void;
  /** id of the <form> the Save button submits */
  formId: string;
  saveLabel?: string;
}) {
  const t = useTranslations("admin.kit");
  if (!dirty && !saving) return null;
  return (
    <div
      role="region"
      aria-label={t("saveRegion")}
      className="sticky bottom-0 z-[var(--z-sticky)] -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-card px-4 py-3 shadow-md md:-mx-6 md:px-6"
    >
      <span className="inline-flex items-center gap-2 text-sm text-warning">
        <Info aria-hidden="true" className="size-4.5" />
        {t("unsaved")}
      </span>
      <span className="ms-auto flex gap-2">
        <Button variant="ghost" size="dense" onClick={onDiscard} disabled={saving} className="pointer-coarse:h-11">
          {t("discard")}
        </Button>
        <Button type="submit" form={formId} size="dense" loading={saving} className="pointer-coarse:h-11">
          <Check aria-hidden="true" />
          {saveLabel ?? t("save")}
        </Button>
      </span>
    </div>
  );
}

/**
 * Leaving with unsaved changes (README 4.6): the browser prompt on reload/close, and a
 * ConfirmDialog for in-app links (captured clicks on <a> outside the form's own controls).
 * Render the returned `dialog` once in the form.
 */
export function useUnsavedGuard(dirty: boolean) {
  const t = useTranslations("admin.kit");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return; // in-page section links
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const dialog = (
    <ConfirmDialog
      open={pendingHref != null}
      onOpenChange={(o) => {
        if (!o) setPendingHref(null);
      }}
      title={t("leaveTitle")}
      body={t("leaveBody")}
      confirmLabel={t("leaveConfirm")}
      destructive={false}
      onConfirm={() => {
        const href = pendingHref;
        dirtyRef.current = false;
        setPendingHref(null);
        // full navigation: the in-memory form state is dropped on purpose
        if (href) window.location.assign(href);
      }}
    />
  );

  return { dialog };
}
