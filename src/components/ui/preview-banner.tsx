import { Eye } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Read on the server only (process env, never NEXT_PUBLIC): true/1 = owner preview (M1-04). */
export function isPreviewMode(): boolean {
  return ["true", "1"].includes((process.env.PREVIEW_MODE ?? "").trim().toLowerCase());
}

/**
 * Fixed "معاينة — بيانات توضيحية" strip for the owner preview (M1-04, PREVIEW_MODE=true set by
 * scripts/preview.sh). Server Component, renders nothing otherwise. Shared by the store and the
 * dashboards: put it first in the layout. Sticky at the top (not overlaying content), warning
 * surface with an icon + text (meaning never by colour alone), role="note".
 */
export async function PreviewBanner() {
  if (!isPreviewMode()) return null;
  const t = await getTranslations("preview");
  return (
    <div
      role="note"
      className="sticky top-0 z-[var(--z-header)] flex min-h-9 items-center justify-center gap-2 bg-warning-subtle px-4 py-1.5 text-center text-sm font-semibold text-foreground"
    >
      <Eye aria-hidden="true" className="size-4 shrink-0 text-warning" />
      <span>{t("banner")}</span>
    </div>
  );
}
