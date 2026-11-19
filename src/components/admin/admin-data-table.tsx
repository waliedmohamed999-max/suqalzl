"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PAGE_SIZES } from "./list-params";
import { SelectBox } from "./select-box";
import { useUrlState } from "./url-state";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Numbers and money: text-end + nowrap (tokens.md 11.4). */
    numeric?: boolean;
    /** Server-side sort key (the `sort` URL param); omit for unsortable columns. */
    sortKey?: string;
    /**
     * Card layout under md: "title" (bold first line), "media" (thumbnail at start), "hide",
     * or default (a "label: value" item; the label is the string header).
     */
    card?: "title" | "media" | "hide";
    /** Accessible / card label when the header is not a plain string. */
    label?: string;
  }
}

export interface BulkAction {
  label: string;
  onSelect: (ids: string[]) => void;
  destructive?: boolean;
}

export interface AdminDataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  caption: string;
  getRowId: (row: T) => string;
  status?: "ready" | "loading" | "error";
  /** EmptyState with an action, or filtered-empty with "clear filters" */
  empty: ReactNode;
  error?: ReactNode;
  /** Server-side paging: ?page (1-based) and ?per */
  pagination?: { page: number; pageSize: number; total: number };
  /** enables row selection (checkboxes in table and cards) */
  selectable?: boolean;
  bulkActions?: BulkAction[];
  /** ⋯ menu at the end of each row (a <RowMenu>) */
  rowMenu?: (row: T) => ReactNode;
  /** accessible name for a row ("select <name>") */
  rowLabel: (row: T) => string;
  /** id for aria-controls from the FilterBar views */
  id?: string;
  /** min width of the desktop table before it scrolls horizontally */
  minWidth?: string;
}

/**
 * DataTable (README 4.6, admin version of the P1 ui/data-table): TanStack Table in manual mode.
 * Sorting and paging are server-side in the URL (?sort=key|-key, ?page, ?per). Optional selection
 * with a mixed header checkbox and a dark bulk-action bar ABOVE the table, selected rows in
 * gold-subtle, a ⋯ row menu, skeleton rows while loading, and the same rows as cards under md.
 */
export function AdminDataTable<T>({
  columns,
  data,
  caption,
  getRowId,
  status = "ready",
  empty,
  error,
  pagination,
  selectable,
  bulkActions,
  rowMenu,
  rowLabel,
  id,
  minWidth = "60rem",
}: AdminDataTableProps<T>) {
  const t = useTranslations("table");
  const tk = useTranslations("admin.table");
  const { get, hrefWith, set } = useUrlState();
  const sort = get("sort") ?? "";
  const [selection, setSelection] = useState<RowSelectionState>({});
  const perId = useId();

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    enableRowSelection: !!selectable,
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
  });

  if (status === "error") return <>{error}</>;
  if (status === "ready" && data.length === 0) return <>{empty}</>;

  const rows = table.getRowModel().rows;
  const selectedIds = Object.keys(selection).filter((k) => selection[k]);
  const all = rows.length > 0 && selectedIds.length === rows.length;
  const some = selectedIds.length > 0 && !all;
  const colCount = columns.length + (selectable ? 1 : 0) + (rowMenu ? 1 : 0);
  const headerLabel = (c: Cell<T, unknown>) => {
    const h = c.column.columnDef.header;
    return c.column.columnDef.meta?.label ?? (typeof h === "string" ? h : "");
  };

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
      aria-busy={status === "loading" || undefined}
    >
      {selectable && selectedIds.length > 0 ? (
        <div
          role="region"
          aria-label={tk("bulk")}
          data-surface="inverse-strong"
          className="flex flex-wrap items-center gap-2 px-3 py-2"
        >
          <strong className="text-sm" aria-live="polite">
            {tk("selected", { count: selectedIds.length })}
          </strong>
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          {bulkActions?.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => a.onSelect(selectedIds)}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-md border px-3 text-sm font-semibold pointer-coarse:min-h-11",
                a.destructive ? "border-danger text-danger" : "border-border text-foreground hover:bg-card",
              )}
            >
              {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelection({})}
            className="ms-auto min-h-9 cursor-pointer text-sm text-foreground-secondary underline underline-offset-4"
          >
            {tk("clearSelection")}
          </button>
        </div>
      ) : null}

      {/* md and up: the table */}
      <div id={id} className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-background">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {selectable ? (
                  <th scope="col" className="w-11 border-b border-border px-2 py-1">
                    <SelectBox
                      checked={all ? true : some ? "indeterminate" : false}
                      onCheckedChange={(c) => table.toggleAllRowsSelected(c)}
                      label={tk("selectAll")}
                    />
                  </th>
                ) : null}
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const key = meta?.sortKey;
                  const dir = key && sort === key ? "asc" : key && sort === `-${key}` ? "desc" : null;
                  const label = h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext());
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={
                        key ? (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") : undefined
                      }
                      className={cn(
                        "border-b border-border px-3 py-2.5 text-xs font-semibold whitespace-nowrap text-muted-foreground",
                        meta?.numeric ? "text-end" : "text-start",
                      )}
                    >
                      {key ? (
                        <Link
                          href={hrefWith({ sort: dir === "asc" ? `-${key}` : key })}
                          scroll={false}
                          className={cn(
                            "inline-flex min-h-8 items-center gap-1 rounded-sm hover:text-foreground",
                            dir && "text-foreground",
                          )}
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
                {rowMenu ? (
                  <th scope="col" className="w-12 border-b border-border">
                    <span className="sr-only">{tk("actions")}</span>
                  </th>
                ) : null}
              </tr>
            ))}
          </thead>
          <tbody>
            {status === "loading"
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td colSpan={colCount} className="px-3 py-3">
                      <Skeleton shape="text" />
                    </td>
                  </tr>
                ))
              : rows.map((row) => {
                  const on = row.getIsSelected();
                  return (
                    <tr
                      key={row.id}
                      aria-selected={selectable ? on : undefined}
                      className={cn(
                        "border-b border-border last:border-b-0",
                        on ? "bg-gold-subtle" : "hover:bg-background",
                      )}
                    >
                      {selectable ? (
                        <td className="px-2 py-1">
                          <SelectBox
                            checked={on}
                            onCheckedChange={(c) => row.toggleSelected(c)}
                            label={tk("selectRow", { name: rowLabel(row.original) })}
                          />
                        </td>
                      ) : null}
                      {row.getVisibleCells().map((c) => (
                        <td
                          key={c.id}
                          className={cn(
                            "px-3 py-2.5 align-middle",
                            c.column.columnDef.meta?.numeric ? "text-end whitespace-nowrap" : "text-start",
                          )}
                        >
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </td>
                      ))}
                      {rowMenu ? <td className="px-2 py-1 text-end">{rowMenu(row.original)}</td> : null}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* under md: the same rows as cards, same fields and selection */}
      <ul aria-label={caption} className="flex flex-col md:hidden">
        {status === "loading"
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex gap-3 border-b border-border p-3 last:border-b-0">
                <Skeleton className="h-16 w-14" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton shape="text" />
                  <Skeleton shape="text" className="w-2/3" />
                </div>
              </li>
            ))
          : rows.map((row) => {
              const on = row.getIsSelected();
              const cells = row.getVisibleCells();
              const media = cells.find((c) => c.column.columnDef.meta?.card === "media");
              const title = cells.find((c) => c.column.columnDef.meta?.card === "title");
              const rest = cells.filter((c) => !c.column.columnDef.meta?.card);
              return (
                <li
                  key={row.id}
                  className={cn("flex gap-3 border-b border-border p-3 last:border-b-0", on && "bg-gold-subtle")}
                >
                  {selectable ? (
                    <SelectBox
                      checked={on}
                      onCheckedChange={(c) => row.toggleSelected(c)}
                      label={tk("selectRow", { name: rowLabel(row.original) })}
                    />
                  ) : null}
                  {media ? (
                    <div className="shrink-0">{flexRender(media.column.columnDef.cell, media.getContext())}</div>
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {title ? (
                      <div className="text-sm font-semibold">
                        {flexRender(title.column.columnDef.cell, title.getContext())}
                      </div>
                    ) : null}
                    <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      {rest.map((c) => (
                        <div key={c.id} className="flex items-center gap-1">
                          <dt className="text-xs text-muted-foreground">{headerLabel(c)}</dt>
                          <dd>{flexRender(c.column.columnDef.cell, c.getContext())}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  {rowMenu ? <div className="shrink-0">{rowMenu(row.original)}</div> : null}
                </li>
              );
            })}
      </ul>

      {pagination ? (
        <Pager
          {...pagination}
          perId={perId}
          hrefFor={(page) => hrefWith({ page: String(page) })}
          onPer={(per) => set({ per: per === PAGE_SIZES[0] ? null : String(per) })}
        />
      ) : null}
    </div>
  );
}

function Pager({
  page,
  pageSize,
  total,
  perId,
  hrefFor,
  onPer,
}: {
  page: number;
  pageSize: number;
  total: number;
  perId: string;
  hrefFor: (page: number) => string;
  onPer: (per: number) => void;
}) {
  const t = useTranslations("table");
  const tk = useTranslations("admin.table");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label={t("pagination")}
      className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2.5 text-sm text-muted-foreground"
    >
      <span>{tk("showing", { from, to, total })}</span>
      <span className="inline-flex items-center gap-1.5">
        <label htmlFor={perId}>{tk("perPage")}</label>
        <select
          id={perId}
          value={pageSize}
          onChange={(e) => onPer(Number(e.target.value))}
          className="h-9 cursor-pointer rounded-md border border-input bg-card px-2 text-sm text-foreground"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </span>
      <span className="ms-auto flex gap-1">
        <PageLink href={hrefFor(page - 1)} disabled={page <= 1}>
          <ChevronLeft data-directional="" aria-hidden="true" />
          {t("previous")}
        </PageLink>
        <PageLink href={hrefFor(page + 1)} disabled={page >= pages}>
          {t("next")}
          <ChevronRight data-directional="" aria-hidden="true" />
        </PageLink>
      </span>
    </nav>
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
    <Link href={href} className={cls} scroll={false}>
      {children}
    </Link>
  );
}
