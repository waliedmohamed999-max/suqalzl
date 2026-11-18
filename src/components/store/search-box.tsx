import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * SearchBox, structure only (P1): a plain GET form to /search?q= (results page and suggestions
 * with role="combobox" come in P2-F2-04). Works without JS.
 */
export function SearchBox({ action, id, className }: { action: string; id: string; className?: string }) {
  const t = useTranslations("store.search");
  return (
    <form role="search" action={action} method="get" className={cn("w-full", className)}>
      <label
        htmlFor={id}
        className="flex min-h-11 items-center gap-2 rounded-md bg-card px-3.5 text-muted-foreground has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring"
      >
        <Search aria-hidden="true" className="size-5 shrink-0" />
        <span className="sr-only">{t("label")}</span>
        <input
          id={id}
          name="q"
          type="search"
          enterKeyHint="search"
          placeholder={t("placeholder")}
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
      </label>
    </form>
  );
}
