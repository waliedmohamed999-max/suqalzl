"use client";

import { Loader2, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, use, useId, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "@/i18n/navigation";
import {
  SORTS,
  catalogHref,
  clearedFilters,
  halalasToRiyalsInput,
  riyalsToHalalas,
  type CatalogQuery,
  type CatalogSort,
} from "./catalog-url";

export interface CatalogFacetsVM {
  /** Bounds of the current scope (halalas), used as placeholders. */
  priceRange: { min: number; max: number } | null;
  vendors: { slug: string; name: string; count: number }[];
}

interface Ctx {
  pending: boolean;
  go: (q: CatalogQuery) => void;
}
const CatalogCtx = createContext<Ctx | null>(null);

/**
 * Holds the navigation transition for the catalogue: filters/sort change the URL with
 * router.replace (no history spam, review 2.4) inside a transition, so the previous results stay
 * on screen (aria-busy) until the server sends the new ones.
 */
export function CatalogProvider({ path, children }: { path: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (q: CatalogQuery) => start(() => router.replace(catalogHref(path, { ...q, page: 1 }), { scroll: false }));
  return <CatalogCtx value={{ pending, go }}>{children}</CatalogCtx>;
}

function useCatalog() {
  const c = use(CatalogCtx);
  if (!c) throw new Error("CatalogProvider missing");
  return c;
}

export function CatalogResults({ children }: { children: ReactNode }) {
  const { pending } = useCatalog();
  const t = useTranslations("catalog");
  return (
    <div aria-busy={pending} className="relative flex flex-col gap-6">
      {pending ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {t("updating")}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function SortSelect({ query, id }: { query: CatalogQuery; id: string }) {
  const t = useTranslations("catalog.sort");
  const { go } = useCatalog();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
      <label htmlFor={id} className="hidden shrink-0 text-sm text-muted-foreground lg:inline">
        {t("label")}
      </label>
      <Select
        id={id}
        aria-label={t("label")}
        value={query.sort}
        onChange={(e) => go({ ...query, sort: e.target.value as CatalogSort })}
        className="w-full lg:w-56"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {t(s)}
          </option>
        ))}
      </Select>
    </div>
  );
}

/**
 * The filter fields (Category filters_block): price range in whole riyals, store, and the flags
 * (on sale, in stock; bargain filter comes with P4.5). Attribute filters (size/colour/material) wait for the
 * taxonomy decision (review 4.1-7), so they are not rendered.
 * `instant` (desktop aside): every change navigates. Otherwise (mobile sheet) the parent applies.
 */
function FilterFields({
  facets,
  value,
  onChange,
  instant,
}: {
  facets: CatalogFacetsVM;
  value: CatalogQuery;
  onChange: (q: CatalogQuery, commit: boolean) => void;
  instant: boolean;
}) {
  const t = useTranslations("catalog.filters");
  const uid = useId();
  const [min, setMin] = useState(halalasToRiyalsInput(value.priceMin));
  const [max, setMax] = useState(halalasToRiyalsInput(value.priceMax));
  const commitPrice = (commit: boolean) =>
    onChange({ ...value, priceMin: riyalsToHalalas(min), priceMax: riyalsToHalalas(max) }, commit);

  return (
    <div className="flex flex-col divide-y divide-border">
      <fieldset className="flex flex-col gap-2 py-4">
        <legend className="mb-2 text-base font-bold">{t("price")}</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-min`} className="text-sm">
              {t("min")}
            </label>
            <Input
              id={`${uid}-min`}
              numeric
              inputMode="numeric"
              autoComplete="off"
              value={min}
              placeholder={facets.priceRange ? halalasToRiyalsInput(facets.priceRange.min) : undefined}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setMin(v);
                if (!instant) onChange({ ...value, priceMin: riyalsToHalalas(v) }, false);
              }}
              onBlur={() => commitPrice(instant)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitPrice(true))}
              aria-describedby={`${uid}-unit`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-max`} className="text-sm">
              {t("max")}
            </label>
            <Input
              id={`${uid}-max`}
              numeric
              inputMode="numeric"
              autoComplete="off"
              value={max}
              placeholder={facets.priceRange ? halalasToRiyalsInput(facets.priceRange.max) : undefined}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setMax(v);
                if (!instant) onChange({ ...value, priceMax: riyalsToHalalas(v) }, false);
              }}
              onBlur={() => commitPrice(instant)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitPrice(true))}
              aria-describedby={`${uid}-unit`}
            />
          </div>
        </div>
        <p id={`${uid}-unit`} className="text-xs text-muted-foreground">
          {t("priceUnit")}
        </p>
      </fieldset>

      {facets.vendors.length > 1 ? (
        <fieldset className="flex flex-col py-4">
          <legend className="mb-1 text-base font-bold">{t("vendor")}</legend>
          {[{ slug: "", name: t("allVendors"), count: null as number | null }, ...facets.vendors].map((v) => (
            <label key={v.slug || "all"} className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
              <input
                type="radio"
                name={`${uid}-vendor`}
                value={v.slug}
                checked={(value.vendor ?? "") === v.slug}
                onChange={() => onChange({ ...value, vendor: v.slug || undefined }, instant)}
                className="size-5 shrink-0 accent-primary"
              />
              <span className="flex gap-1.5">
                {v.name}
                {v.count != null ? <span className="num text-muted-foreground">({v.count})</span> : null}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col py-4">
        <legend className="mb-1 text-base font-bold">{t("more")}</legend>
        <Switch
          id={`${uid}-sale`}
          label={t("onSale")}
          checked={value.onSale}
          onChange={(e) => onChange({ ...value, onSale: e.target.checked }, instant)}
        />
        <Switch
          id={`${uid}-stock`}
          label={t("inStock")}
          checked={value.inStock}
          onChange={(e) => onChange({ ...value, inStock: e.target.checked }, instant)}
        />
      </fieldset>
    </div>
  );
}

/** Desktop aside (lg+): 280px sticky column, changes apply at once. */
export function FilterAside({ facets, query }: { facets: CatalogFacetsVM; query: CatalogQuery }) {
  const t = useTranslations("catalog.filters");
  const { go } = useCatalog();
  // key: re-mount (reset local price inputs) whenever the applied query changes from outside.
  const key = JSON.stringify([query.priceMin, query.priceMax]);
  return (
    <aside aria-labelledby="filters-title" className="sticky top-4 hidden w-70 shrink-0 self-start lg:block">
      <div className="flex items-center justify-between">
        <h2 id="filters-title" className="text-lg font-bold">
          {t("title")}
        </h2>
        <Button variant="link" onClick={() => go(clearedFilters(query))}>
          {t("clearAll")}
        </Button>
      </div>
      <FilterFields key={key} facets={facets} value={query} instant onChange={(q, commit) => commit && go(q)} />
    </aside>
  );
}

/** Mobile/tablet: "تصفية (N)" button → bottom sheet with local state, applied on "اعرض النتائج". */
export function FilterSheet({
  facets,
  query,
  activeCount,
}: {
  facets: CatalogFacetsVM;
  query: CatalogQuery;
  activeCount: number;
}) {
  const t = useTranslations("catalog.filters");
  const tc = useTranslations("common");
  const { go } = useCatalog();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(query);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 lg:hidden">
          <SlidersHorizontal aria-hidden="true" />
          {t("open")}
          {activeCount ? (
            <span className="num inline-flex min-w-5.5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {activeCount}
              <span className="sr-only">{t("activeCount", { count: activeCount })}</span>
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent side="bottom" title={t("sheetTitle")} closeLabel={tc("close")} className="lg:hidden">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            go(draft);
          }}
        >
          <div className="px-4">
            <FilterFields facets={facets} value={draft} instant={false} onChange={(q) => setDraft(q)} />
          </div>
          <div className="sticky bottom-0 flex gap-2.5 border-t border-border bg-card px-4 py-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setDraft(clearedFilters(draft))}
            >
              {t("clear")}
            </Button>
            <Button type="submit" size="lg" className="flex-[2]">
              {t("apply")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
