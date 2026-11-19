"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useUrlState } from "./url-state";

export interface FilterView {
  /** value of the view param; the first view is the default and has no param */
  key: string;
  label: string;
  count?: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  /** URL param name */
  param: string;
  label: string;
  options: FilterOption[];
}

/**
 * FilterBar (README 4.6): saved views (tabs with counters), search (debounce 300ms), filter
 * selects shown as "الاسم: القيمة" (active = 2px border-strong), removable chips for what is
 * applied, "مسح الفلاتر" and the result count. ALL state lives in the URL (?view ?q ?<param>),
 * changes reset ?page, so the list page (an RSC) refetches and links are shareable.
 */
export function FilterBar({
  views,
  viewParam = "view",
  search,
  filters = [],
  resultCount,
  controls,
}: {
  views?: FilterView[];
  /** URL param the views write (default "view"; e.g. "status" when a view is a status filter) */
  viewParam?: string;
  search?: { placeholder: string; param?: string };
  filters?: FilterDef[];
  resultCount?: number;
  /** id of the region the views filter (aria-controls) */
  controls?: string;
}) {
  const t = useTranslations("admin.filters");
  const { get, set, pending } = useUrlState();
  const qParam = search?.param ?? "q";
  const urlQ = get(qParam) ?? "";
  const [q, setQ] = useState(urlQ);
  const lastSent = useRef(urlQ);
  const searchId = useId();

  // Back/forward or "clear filters" changed the URL: follow it.
  useEffect(() => {
    if (urlQ !== lastSent.current) {
      lastSent.current = urlQ;
      setQ(urlQ);
    }
  }, [urlQ]);

  useEffect(() => {
    if (q === lastSent.current) return;
    const id = setTimeout(() => {
      lastSent.current = q;
      set({ [qParam]: q.trim() || null });
    }, 300);
    return () => clearTimeout(id);
  }, [q, qParam, set]);

  const activeView = get(viewParam) ?? views?.[0]?.key;
  const applied = filters.flatMap((f) => {
    const v = get(f.param);
    const opt = v ? f.options.find((o) => o.value === v) : undefined;
    return opt ? [{ f, opt }] : [];
  });
  const hasAny = applied.length > 0 || urlQ !== "";

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!views?.length) return;
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const fwd = e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (fwd ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next]?.focus();
  };

  return (
    <section aria-label={t("label")} aria-busy={pending || undefined} className="flex flex-col gap-3">
      {views?.length ? (
        <div
          role="tablist"
          aria-label={t("views")}
          onKeyDown={onTabKey}
          className="flex gap-1 overflow-x-auto border-b border-border"
        >
          {views.map((v, i) => {
            const on = v.key === activeView;
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={controls}
                tabIndex={on ? 0 : -1}
                onClick={() => set({ [viewParam]: i === 0 ? null : v.key })}
                className={cn(
                  "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap",
                  on
                    ? "border-border-strong font-bold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {v.label}
                {v.count != null ? (
                  <span className="inline-flex h-5 min-w-5.5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-bold text-foreground-secondary">
                    {v.count.toLocaleString("en-US")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {search ? (
          <div className="flex min-h-10 flex-[1_1_16rem] items-center gap-2 rounded-md border border-input bg-card px-3 text-muted-foreground has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring">
            <Search aria-hidden="true" className="size-4.5 shrink-0" />
            <label htmlFor={searchId} className="sr-only">
              {t("search")}
            </label>
            <input
              id={searchId}
              type="search"
              value={q}
              placeholder={search.placeholder}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        ) : null}
        {filters.map((f) => (
          <FilterSelect
            key={f.param}
            def={f}
            value={get(f.param) ?? ""}
            onChange={(v) => set({ [f.param]: v || null })}
          />
        ))}
      </div>

      {hasAny || resultCount != null ? (
        <div className="flex flex-wrap items-center gap-2">
          {urlQ ? (
            <Chip
              label={t("searchChip", { q: urlQ })}
              removeLabel={t("remove", { name: t("search") })}
              onRemove={() => set({ [qParam]: null })}
            />
          ) : null}
          {applied.map(({ f, opt }) => (
            <Chip
              key={f.param}
              label={`${f.label}: ${opt.label}`}
              removeLabel={t("remove", { name: `${f.label}: ${opt.label}` })}
              onRemove={() => set({ [f.param]: null })}
            />
          ))}
          {hasAny ? (
            <button
              type="button"
              onClick={() => set(Object.fromEntries([[qParam, null], ...filters.map((f) => [f.param, null])]))}
              className="min-h-9 cursor-pointer text-sm font-semibold text-gold-text underline underline-offset-4"
            >
              {t("clear")}
            </button>
          ) : null}
          {resultCount != null ? (
            <span role="status" className="ms-auto text-sm text-muted-foreground">
              {t("results", { count: resultCount })}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function FilterSelect({ def, value, onChange }: { def: FilterDef; value: string; onChange: (v: string) => void }) {
  const t = useTranslations("admin.filters");
  const id = useId();
  const on = value !== "";
  const current = def.options.find((o) => o.value === value)?.label ?? t("all");
  return (
    <span
      className={cn(
        "relative inline-flex min-h-10 items-center gap-1.5 rounded-md bg-card px-3 text-sm whitespace-nowrap has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-ring",
        on ? "border-2 border-border-strong" : "border border-input",
      )}
    >
      <label htmlFor={id} className="text-muted-foreground">
        {def.label}:
      </label>
      <span aria-hidden="true" className="font-semibold">
        {current}
      </span>
      {/* the native select covers the pill: keyboard, screen readers and phone pickers for free */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        <option value="">{t("all")}</option>
        {def.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

function Chip({ label, removeLabel, onRemove }: { label: string; removeLabel: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted ps-3 pe-1 text-sm">
      {label}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-accent"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}
