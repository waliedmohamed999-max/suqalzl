"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toLatinDigits } from "@/lib/format/digits";
import { cn } from "@/lib/utils";
import {
  localKey,
  regenerateVariants,
  variantLabel,
  type FieldErrors,
  type OptionState,
  type VariantState,
} from "./product-form-state";
import { SelectBox } from "./select-box";

const MAX_OPTIONS = 3;
const LOW_STOCK = 3;

/**
 * VariantMatrix (README 4.6): options (name + values, in both languages because the store is
 * bilingual) -> generated variants: SKU, price incl. VAT, compare-at, stock (low / sold-out badge),
 * reserved (read only), active. Bulk edit for the selected rows (price, stock, activate,
 * deactivate). Removing a value drops its variants from the form; saved ones are archived by the
 * server, never deleted, so order history stays.
 */
export function VariantMatrix({
  options,
  variants,
  onChange,
  errors,
  translateError,
}: {
  options: OptionState[];
  variants: VariantState[];
  onChange: (next: { options: OptionState[]; variants: VariantState[] }) => void;
  errors: FieldErrors;
  translateError: (key: string) => string;
}) {
  const t = useTranslations("admin.variants");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archivedCount, setArchivedCount] = useState(0);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const setOptions = (next: OptionState[]) => {
    const { variants: v, archived } = regenerateVariants(next, variants);
    setArchivedCount((c) => c + archived.length);
    setSelected((s) => new Set([...s].filter((k) => v.some((x) => x.key === k))));
    onChange({ options: next, variants: v });
  };
  const setVariant = (key: string, patch: Partial<VariantState>) =>
    onChange({ options, variants: variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) });
  const setMany = (patch: Partial<VariantState>) =>
    onChange({ options, variants: variants.map((v) => (selected.has(v.key) ? { ...v, ...patch } : v)) });

  const err = (path: string) => (errors[path] ? translateError(errors[path]!) : undefined);
  const allOn = variants.length > 0 && selected.size === variants.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="label text-foreground">{t("options")}</span>
        <Button
          variant="outline"
          size="dense"
          disabled={options.length >= MAX_OPTIONS}
          onClick={() => setOptions([...options, { key: localKey("o"), nameAr: "", nameEn: "", values: [] }])}
        >
          <Plus aria-hidden="true" />
          {t("addOption")}
        </Button>
      </div>
      {options.length === 0 ? <p className="text-sm text-muted-foreground">{t("noOptions")}</p> : null}

      {options.map((o, oi) => (
        <fieldset key={o.key} className="flex flex-col gap-3 rounded-md border border-border p-3">
          <legend className="sr-only">{t("optionN", { n: oi + 1 })}</legend>
          <div className="flex flex-wrap items-start gap-2">
            <LabeledInput
              id={`${o.key}-ar`}
              label={t("optionNameAr")}
              value={o.nameAr}
              error={err(`options.${oi}.nameAr`)}
              onChange={(nameAr) => setOptions(options.map((x) => (x.key === o.key ? { ...x, nameAr } : x)))}
            />
            <LabeledInput
              id={`${o.key}-en`}
              label={t("optionNameEn")}
              dir="ltr"
              value={o.nameEn}
              error={err(`options.${oi}.nameEn`)}
              onChange={(nameEn) => setOptions(options.map((x) => (x.key === o.key ? { ...x, nameEn } : x)))}
            />
            <Button
              variant="ghost"
              size="icon-dense"
              className="mt-6 text-danger"
              aria-label={t("removeOption", { name: o.nameAr || t("optionN", { n: oi + 1 }) })}
              onClick={() => setOptions(options.filter((x) => x.key !== o.key))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          <ul
            aria-label={t("valuesOf", { name: o.nameAr || t("optionN", { n: oi + 1 }) })}
            className="flex flex-col gap-2"
          >
            {o.values.map((v, vi) => (
              <li key={v.key} className="flex flex-wrap items-start gap-2">
                <LabeledInput
                  id={`${v.key}-ar`}
                  label={t("valueAr")}
                  hideLabel={vi > 0}
                  value={v.valueAr}
                  error={err(`options.${oi}.values.${vi}.valueAr`)}
                  onChange={(valueAr) =>
                    setOptions(
                      options.map((x) =>
                        x.key === o.key
                          ? { ...x, values: x.values.map((y) => (y.key === v.key ? { ...y, valueAr } : y)) }
                          : x,
                      ),
                    )
                  }
                />
                <LabeledInput
                  id={`${v.key}-en`}
                  label={t("valueEn")}
                  hideLabel={vi > 0}
                  dir="ltr"
                  value={v.valueEn}
                  error={err(`options.${oi}.values.${vi}.valueEn`)}
                  onChange={(valueEn) =>
                    setOptions(
                      options.map((x) =>
                        x.key === o.key
                          ? { ...x, values: x.values.map((y) => (y.key === v.key ? { ...y, valueEn } : y)) }
                          : x,
                      ),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-dense"
                  className={vi === 0 ? "mt-6" : undefined}
                  aria-label={t("removeValue", { name: v.valueAr || String(vi + 1) })}
                  onClick={() =>
                    setOptions(
                      options.map((x) =>
                        x.key === o.key ? { ...x, values: x.values.filter((y) => y.key !== v.key) } : x,
                      ),
                    )
                  }
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          {err(`options.${oi}.values`) ? (
            <p role="alert" className="text-sm text-danger">
              {err(`options.${oi}.values`)}
            </p>
          ) : null}
          <Button
            variant="outline"
            size="dense"
            className="self-start"
            onClick={() =>
              setOptions(
                options.map((x) =>
                  x.key === o.key
                    ? { ...x, values: [...x.values, { key: localKey("ov"), valueAr: "", valueEn: "" }] }
                    : x,
                ),
              )
            }
          >
            <Plus aria-hidden="true" />
            {t("addValue")}
          </Button>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <span className="label text-foreground">{t("variants", { count: variants.length })}</span>
        <span className="text-xs text-muted-foreground">{t("generatedHint")}</span>
      </div>
      {archivedCount > 0 ? (
        <p role="status" className="text-sm text-warning">
          {t("archived", { count: archivedCount })}
        </p>
      ) : null}
      {errors.variants ? (
        <p role="alert" className="text-sm text-danger">
          {translateError(errors.variants)}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {selected.size > 0 ? (
          <div
            role="region"
            aria-label={t("bulk")}
            data-surface="inverse-strong"
            className="flex flex-wrap items-end gap-2 px-3 py-2"
          >
            <strong className="self-center text-sm">{t("selected", { count: selected.size })}</strong>
            <BulkField
              id="bulk-price"
              label={t("bulkPrice")}
              value={bulkPrice}
              onChange={setBulkPrice}
              onApply={() => {
                if (bulkPrice.trim()) setMany({ price: bulkPrice.trim() });
              }}
              applyLabel={t("apply")}
            />
            <BulkField
              id="bulk-stock"
              label={t("bulkStock")}
              value={bulkStock}
              onChange={setBulkStock}
              onApply={() => {
                if (bulkStock.trim()) setMany({ stock: bulkStock.trim() });
              }}
              applyLabel={t("apply")}
            />
            <button type="button" onClick={() => setMany({ isActive: true })} className={bulkBtn}>
              {t("activate")}
            </button>
            <button type="button" onClick={() => setMany({ isActive: false })} className={bulkBtn}>
              {t("deactivate")}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ms-auto min-h-9 cursor-pointer self-center text-sm text-foreground-secondary underline"
            >
              {t("clearSelection")}
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <caption className="sr-only">{t("caption")}</caption>
            <thead className="bg-background text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-11 border-b border-border px-2 py-1">
                  <SelectBox
                    label={t("selectAll")}
                    checked={allOn ? true : selected.size ? "indeterminate" : false}
                    onCheckedChange={(c) => setSelected(c ? new Set(variants.map((v) => v.key)) : new Set())}
                  />
                </th>
                <th scope="col" className={th}>
                  {t("colVariant")}
                </th>
                <th scope="col" className={th}>
                  SKU
                </th>
                <th scope="col" className={cn(th, "text-end")}>
                  {t("colPrice")}
                </th>
                <th scope="col" className={cn(th, "text-end")}>
                  {t("colCompareAt")}
                </th>
                <th scope="col" className={cn(th, "text-end")}>
                  {t("colStock")}
                </th>
                <th scope="col" className={cn(th, "text-end")}>
                  {t("colReserved")}
                </th>
                <th scope="col" className={th}>
                  {t("colActive")}
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => {
                const name = variantLabel(v, options) || t("single");
                const stock = Number.parseInt(v.stock, 10);
                const available = Number.isFinite(stock) ? stock - v.reservedStock : null;
                const on = selected.has(v.key);
                return (
                  <tr key={v.key} className={cn("border-b border-border last:border-b-0", on && "bg-gold-subtle")}>
                    <td className="px-2 py-1">
                      <SelectBox
                        label={t("selectRow", { name })}
                        checked={on}
                        onCheckedChange={(c) =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (c) n.add(v.key);
                            else n.delete(v.key);
                            return n;
                          })
                        }
                      />
                    </td>
                    <th scope="row" className="px-3 py-2 text-start font-semibold whitespace-nowrap">
                      {name}
                    </th>
                    <td className="px-3 py-2">
                      <CellInput
                        label={t("skuOf", { name })}
                        value={v.sku}
                        className="w-36"
                        error={err(`variants.${i}.sku`)}
                        onChange={(sku) => setVariant(v.key, { sku: sku.toUpperCase() })}
                      />
                    </td>
                    <td className="px-3 py-2 text-end">
                      <CellInput
                        label={t("priceOf", { name })}
                        numeric
                        inputMode="decimal"
                        value={v.price}
                        className="w-24"
                        error={err(`variants.${i}.price`)}
                        onChange={(price) => setVariant(v.key, { price })}
                      />
                    </td>
                    <td className="px-3 py-2 text-end">
                      <CellInput
                        label={t("compareAtOf", { name })}
                        numeric
                        inputMode="decimal"
                        placeholder="—"
                        value={v.compareAtPrice}
                        className="w-24"
                        error={err(`variants.${i}.compareAtPrice`)}
                        onChange={(compareAtPrice) => setVariant(v.key, { compareAtPrice })}
                      />
                    </td>
                    <td className="px-3 py-2 text-end">
                      <span className="inline-flex items-center gap-1.5">
                        {available != null && available <= 0 ? (
                          <Badge tone="danger" size="sm">
                            {t("soldOut")}
                          </Badge>
                        ) : available != null && available <= LOW_STOCK ? (
                          <Badge tone="warning" size="sm">
                            {t("low")}
                          </Badge>
                        ) : null}
                        <CellInput
                          label={t("stockOf", { name })}
                          numeric
                          inputMode="numeric"
                          value={v.stock}
                          className="w-16"
                          error={err(`variants.${i}.stock`)}
                          onChange={(s) => setVariant(v.key, { stock: s })}
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2 text-end text-muted-foreground">{v.reservedStock}</td>
                    <td className="px-3 py-2">
                      <label className="relative inline-flex h-6 w-11 cursor-pointer">
                        <span className="sr-only">{t("activeOf", { name })}</span>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={v.isActive}
                          onChange={(e) => setVariant(v.key, { isActive: e.target.checked })}
                          className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none rounded-full"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-full border-2 border-neutral bg-card peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute start-1 top-1 size-4 rounded-full bg-neutral transition-transform duration-120 peer-checked:bg-primary-foreground peer-checked:ltr:translate-x-5 peer-checked:rtl:-translate-x-5"
                        />
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("priceHint")}</p>
    </div>
  );
}

const th = "border-b border-border px-3 py-2.5 text-start font-semibold whitespace-nowrap";
const bulkBtn =
  "inline-flex min-h-9 cursor-pointer items-center self-center rounded-md border border-border px-3 text-sm font-semibold hover:bg-card";

function LabeledInput({
  id,
  label,
  value,
  onChange,
  error,
  dir,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  dir?: "ltr";
  hideLabel?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1">
      <label htmlFor={id} className={cn("text-xs font-semibold", hideLabel && "sr-only")}>
        {label}
      </label>
      <Input
        id={id}
        dense
        dir={dir}
        value={value}
        maxLength={40}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <span id={`${id}-err`} className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function CellInput({
  label,
  value,
  onChange,
  error,
  className,
  numeric,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  className?: string;
  numeric?: boolean;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
}) {
  return (
    <span className="inline-flex flex-col items-stretch gap-0.5">
      <Input
        dense
        numeric={numeric}
        inputMode={inputMode}
        aria-label={label}
        aria-invalid={!!error}
        title={error}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-9 text-sm", className)}
      />
      {error ? <span className="text-start text-xs text-danger">{error}</span> : null}
    </span>
  );
}

function BulkField({
  id,
  label,
  value,
  onChange,
  onApply,
  applyLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  applyLabel: string;
}) {
  return (
    <span className="flex items-end gap-1">
      <span className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-xs">
          {label}
        </label>
        <input
          id={id}
          dir="ltr"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(toLatinDigits(e.target.value))}
          className="h-9 w-24 rounded-sm border border-input bg-card px-2 text-sm text-card-foreground"
        />
      </span>
      <button type="button" onClick={onApply} className={bulkBtn}>
        {applyLabel}
      </button>
    </span>
  );
}
