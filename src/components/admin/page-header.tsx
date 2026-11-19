import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * PageHeader (README 4.6): breadcrumbs + h1 (+ StatusBadge) + description + actions.
 * Pass actions in visual order; the primary one goes last (it lands at the far `end`), and delete
 * actions use the `destructive` button variant.
 */
export function PageHeader({
  title,
  breadcrumbs,
  status,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  breadcrumbs?: Crumb[];
  status?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("dash");
  return (
    <div className={cn("flex flex-wrap items-end gap-4 pt-4 pb-1", className)}>
      <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-0.5">
        {breadcrumbs?.length ? (
          <nav aria-label={t("breadcrumbs")}>
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {breadcrumbs.map((c, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                    {c.href && !last ? (
                      <Link
                        href={c.href}
                        className="inline-flex min-h-6 items-center hover:text-foreground hover:underline"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={last ? "page" : undefined}>{c.label}</span>
                    )}
                    {last ? null : <ChevronRight aria-hidden="true" data-directional="" className="size-3" />}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold">{title}</h1>
          {status}
        </div>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
