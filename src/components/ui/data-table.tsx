"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { Skeleton } from "./skeleton";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Numbers and money: text-end + nowrap (tokens.md 11.4). */
    numeric?: boolean;
    /** Server-side sort key (the `sort` URL param); omit for unsortable columns. */
    sortKey?: string;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Visually hidden table caption (accessible name). */
  caption: string;
  getRowId: (row: T) => string;
  status?: "ready" | "loading" | "error";
  /** Rendered when there are no rows (EmptyState with an action, or filtered-empty with "clear filters"). */
  empty: ReactNode;
  /** Rendered when status = error (ErrorState with retry). */
  error?: ReactNode;
  /** Server-side pagination; page is 1-based and lives in ?page=. */
  pagination?: { page: number; pageSize: number; total: number };
  dense?: boolean;
}

/**
 * DataTable (tokens.md 11.4, basic P1 version): TanStack Table in manual mode. Sorting and paging
 * are server-side and live in the URL (?sort=key | -key, ?page=N) as real links, so the page (an RSC)
 * refetches. Sticky header, aria-sort, numeric columns end-aligned, horizontal scroll under md.
 * Column defs contain render functions, so define them in a client module next to the page.
 */
export function DataTable<T>({
  columns,
  data,
  caption,
  getRowId,
  status = "ready",
  empty,
  error,
  pagination,
  dense,
}: DataTableProps<T>) {
  const t = useTranslations("table");
  const params = useSearchParams();
  const pathname = usePathname();
  const sort = params.get("sort") ?? "";

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const hrefWith = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const cell = dense ? "px-3 py-2" : "px-3 py-3";

  if (status === "error") return <>{error}</>;
  if (status === "ready" && data.length === 0) return <>{empty}</>;

  const pages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-3" aria-busy={status === "loading" || undefined}>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-[var(--z-sticky)] bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const key = meta?.sortKey;
                  const dir = key && sort === key ? "asc" : key && sort === `-${key}` ? "desc" : null;
                  const label = h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext());
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={key ? (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") : undefined}
                      className={cn(
                        "border-b border-border text-xs font-semibold whitespace-nowrap text-muted-foreground",
                        cell,
                        meta?.numeric ? "text-end" : "text-start",
                      )}
                    >
                      {key ? (
                        <Link
                          href={hrefWith({ sort: dir === "asc" ? `-${key}` : key, page: null })}
                          scroll={false}
                          className="inline-flex min-h-9 items-center gap-1 rounded-sm hover:text-foreground"
                        >
                          {label}
                          <span className="sr-only">{dir === "asc" ? t("sortDesc") : t("sortAsc")}</span>
                          {dir === "asc" ? (
                            <ArrowUp aria-hidden="true" className="size-3.5" />
                          ) : dir === "desc" ? (
                            <ArrowDown aria-hidden="true" className="size-3.5" />
                          ) : (
                            <ArrowUpDown aria-hidden="true" className="size-3.5" />
                          )}
                        </Link>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {status === "loading"
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={columns.length} className={cell}>
                      <Skeleton shape="text" />
                    </td>
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-muted">
                    {row.getVisibleCells().map((c) => (
                      <td
                        key={c.id}
                        className={cn(
                          cell,
                          "align-middle",
                          c.column.columnDef.meta?.numeric ? "text-end whitespace-nowrap" : "text-start",
                        )}
                      >
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {pagination && pages > 1 ? (
        <nav aria-label={t("pagination")} className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {t("pageOf", { page: pagination.page, pages })} · {t("total", { total: pagination.total })}
          </span>
          <span className="flex gap-2">
            <PageLink href={hrefWith({ page: String(pagination.page - 1) })} disabled={pagination.page <= 1}>
              <ChevronLeft data-directional="" aria-hidden="true" />
              {t("previous")}
            </PageLink>
            <PageLink href={hrefWith({ page: String(pagination.page + 1) })} disabled={pagination.page >= pages}>
              {t("next")}
              <ChevronRight data-directional="" aria-hidden="true" />
            </PageLink>
          </span>
        </nav>
      ) : null}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: ReactNode }) {
  const cls = buttonVariants({ variant: "outline", size: "dense" });
  if (disabled)
    return (
      <span aria-disabled="true" className={cls}>
        {children}
      </span>
    );
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
