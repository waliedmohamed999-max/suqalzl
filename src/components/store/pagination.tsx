import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Builds "/path?a=1&page=2" keeping the current query (page=1 is dropped: one canonical URL). */
export function withQuery(
  path: string,
  query: Record<string, string | undefined>,
  patch: Record<string, string | null>,
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...query, ...patch })) {
    if (v != null && v !== "" && !(k === "page" && v === "1")) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}

function pagesToShow(page: number, last: number): (number | "gap")[] {
  const set = new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/**
 * Pagination (Category-desktop): real links for SEO and no-JS, aria-current on the current page,
 * 44px targets, "السابق/التالي" with directional chevrons. Also used on mobile (the design's
 * "عرض المزيد" appends the next page; links keep it working without JS).
 */
export async function Pagination({
  path,
  query,
  page,
  pageSize,
  total,
}: {
  path: string;
  query: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const t = await getTranslations("catalog.pagination");
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (last <= 1) return null;
  const item = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-semibold";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={t("label")} className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">{t("showing", { from, to, total })}</p>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 ? (
          <li>
            <Link
              href={withQuery(path, query, { page: String(page - 1) })}
              className={cn(item, "gap-1 border-input bg-card")}
              rel="prev"
            >
              <ChevronLeft aria-hidden="true" data-directional="" className="size-4" />
              {t("previous")}
            </Link>
          </li>
        ) : null}
        {pagesToShow(page, last).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={withQuery(path, query, { page: String(p) })}
                aria-current={p === page ? "page" : undefined}
                aria-label={t("page", { page: p })}
                className={cn(
                  item,
                  "num",
                  p === page ? "border-border-strong bg-primary text-primary-foreground" : "border-input bg-card",
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        {page < last ? (
          <li>
            <Link
              href={withQuery(path, query, { page: String(page + 1) })}
              className={cn(item, "gap-1 border-input bg-card")}
              rel="next"
            >
              {t("next")}
              <ChevronRight aria-hidden="true" data-directional="" className="size-4" />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
