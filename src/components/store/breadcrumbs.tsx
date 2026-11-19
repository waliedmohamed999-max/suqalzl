import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/site-url";
import { JsonLd } from "./json-ld";
import type { CrumbVM } from "./types";

/**
 * Breadcrumbs (lib.py breadcrumbs) + BreadcrumbList JSON-LD. The home crumb is added here; the
 * last item is the current page (aria-current, not a link).
 */
export async function Breadcrumbs({ items, locale }: { items: CrumbVM[]; locale: string }) {
  const t = await getTranslations("catalog");
  const all: CrumbVM[] = [{ name: t("home"), href: "/" }, ...items];
  return (
    <>
      <nav aria-label={t("breadcrumbs")} className="text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li key={c.href} className="flex min-w-0 items-center gap-1">
                {last ? (
                  <span aria-current="page" className="truncate text-foreground">
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link
                      href={c.href}
                      className="inline-flex min-h-11 items-center hover:text-foreground hover:underline"
                    >
                      {c.name}
                    </Link>
                    <ChevronRight aria-hidden="true" data-directional="" className="size-3.5 shrink-0" />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: absoluteUrl(c.href, locale),
          })),
        }}
      />
    </>
  );
}
