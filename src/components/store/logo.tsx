import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Temporary logo from the boards (README 1: "الشعار مؤقت"): gold diamond with "ز" + name + Latin
 * wordmark. Colours follow the surface scope (foreground / gold), so it works on light and dark.
 */
export function Logo({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  const t = useTranslations("common");
  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 items-center gap-2.5 rounded-sm text-foreground no-underline", className)}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 rotate-45 items-center justify-center border border-gold"
      >
        <span className="-rotate-45 text-sm font-bold text-gold">ز</span>
      </span>
      <span className="flex flex-col leading-snug">
        <span className={cn("font-bold", size === "sm" ? "text-base" : "text-lg")}>
          {t("siteName")}
          <span className="sr-only">{t("homeSuffix")}</span>
        </span>
        <span aria-hidden="true" dir="ltr" className="text-xs font-semibold text-muted-foreground rtl:text-end">
          {t("wordmark")}
        </span>
      </span>
    </Link>
  );
}

/** Thin gold rule with a diamond (the single ornament of the identity, README 3-1). */
export function Ornament({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex w-10 items-center gap-1.5 text-gold", className)}>
      <span className="h-px flex-1 bg-current" />
      <span className="size-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-current" />
    </span>
  );
}
