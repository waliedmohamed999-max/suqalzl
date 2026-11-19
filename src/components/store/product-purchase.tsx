"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Stepper } from "@/components/ui/stepper";
import type { ProductDetailDTO } from "@/features/catalog/schema";
import { cn } from "@/lib/utils";
import type { AddToCartAction } from "./action-types";
import { AddToCartButton } from "./add-to-cart-button";
import { DiscountBadge, Price, discountPercent } from "./price";

type Variant = ProductDetailDTO["variants"][number];
type Option = ProductDetailDTO["options"][number];

function findVariant(variants: Variant[], options: Option[], sel: Record<string, string>): Variant | undefined {
  return variants.find((v) => options.every((o, i) => v.optionValueIds[i] === sel[o.id]));
}

/**
 * ProductPurchase island (review 3.5): the variant picker (OptionChip per value, radiogroup
 * semantics via native radios), the price/compare-at/discount of the selected variant, the stock
 * message (role=status), quantity Stepper (max = variant.maxQty from the server) and add-to-cart.
 * Every variant comes in the DTO, so changing a size never calls the server. A value that has no
 * purchasable variant with the other current choices is shown but marked unavailable.
 * Mobile: a sticky action bar repeats price + button (StickyActionBar).
 */
export function ProductPurchase({
  name,
  options,
  variants,
  defaultVariantId,
  addToCart,
}: {
  name: string;
  options: Option[];
  variants: Variant[];
  defaultVariantId: string;
  addToCart: AddToCartAction;
}) {
  const t = useTranslations("product");
  const initial = variants.find((v) => v.id === defaultVariantId) ?? variants[0];
  const [sel, setSel] = useState<Record<string, string>>(() =>
    Object.fromEntries(options.map((o, i) => [o.id, initial?.optionValueIds[i] ?? o.values[0]?.id ?? ""])),
  );
  const [qty, setQty] = useState(1);
  const variant = useMemo(() => findVariant(variants, options, sel), [variants, options, sel]);
  const available = !!variant && variant.stockLevel !== "OUT" && variant.maxQty > 0;
  const maxQty = Math.max(1, variant?.maxQty ?? 1);
  const pct = variant ? discountPercent(variant.price, variant.compareAtPrice) : null;
  const selectionLabel = options
    .map((o) => o.values.find((v) => v.id === sel[o.id])?.value)
    .filter(Boolean)
    .join(" · ");

  const valueAvailable = (optIndex: number, valueId: string) =>
    variants.some(
      (v) =>
        v.optionValueIds[optIndex] === valueId &&
        v.stockLevel !== "OUT" &&
        options.every((o, i) => i === optIndex || v.optionValueIds[i] === sel[o.id]),
    );

  const choose = (optionId: string, valueId: string) => {
    setSel((s) => ({ ...s, [optionId]: valueId }));
    setQty(1);
  };

  const price = variant ? (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <Price halalas={variant.price} compareAt={variant.compareAtPrice} size="lg" />
      {pct ? <DiscountBadge percent={pct} /> : null}
    </div>
  ) : null;

  const button = (
    <AddToCartButton
      action={addToCart}
      variantId={variant?.id}
      qty={qty}
      size="lg"
      disabled={!available}
      label={available ? undefined : t("unavailable")}
      className="flex-1"
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        {price}
        <p className="text-xs text-muted-foreground">{t("vatIncluded")}</p>
      </div>

      {options.map((o, oi) => {
        const current = o.values.find((v) => v.id === sel[o.id]);
        return (
          <fieldset key={o.id} className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-bold">
              {o.name}: <span className="font-semibold">{current?.value}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {o.values.map((v) => {
                const ok = valueAvailable(oi, v.id);
                const checked = sel[o.id] === v.id;
                return (
                  <label
                    key={v.id}
                    className={cn(
                      "relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3.5 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                      checked ? "border-2 border-border-strong bg-card" : "border-input bg-card",
                      !ok && "bg-muted text-muted-foreground line-through",
                    )}
                  >
                    <input
                      type="radio"
                      name={`opt-${o.id}`}
                      value={v.id}
                      checked={checked}
                      onChange={() => choose(o.id, v.id)}
                      className="sr-only"
                      aria-describedby={!ok ? `na-${v.id}` : undefined}
                    />
                    {v.value}
                    {!ok ? (
                      <span id={`na-${v.id}`} className="sr-only">
                        {t("valueUnavailable")}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <p
        role="status"
        className={cn(
          "flex min-h-6 items-center gap-1.5 text-sm font-semibold",
          !available || variant?.stockLevel === "LOW" ? "text-danger" : "text-success",
        )}
      >
        {!variant ? (
          <>
            <AlertTriangle aria-hidden="true" className="size-4" />
            {t("combinationMissing")}
          </>
        ) : !available ? (
          <>
            <AlertTriangle aria-hidden="true" className="size-4" />
            {t("outOfStock")}
          </>
        ) : variant.stockLevel === "LOW" ? (
          <>
            <AlertTriangle aria-hidden="true" className="size-4" />
            {t("lowStock")}
          </>
        ) : (
          <>
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {t("inStock")}
          </>
        )}
      </p>

      <div className="flex items-stretch gap-2.5">
        <Stepper
          value={qty}
          max={maxQty}
          onChange={setQty}
          disabled={!available}
          label={t("qty")}
          decreaseLabel={t("qtyDecrease")}
          increaseLabel={t("qtyIncrease")}
        />
        {button}
      </div>

      {/* StickyActionBar (mobile): price + selection + the same action. */}
      <div
        data-sticky-action-bar=""
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex items-center gap-3 border-t border-border bg-card px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-md lg:hidden"
      >
        <div className="flex min-w-0 flex-col">
          {variant ? <Price halalas={variant.price} size="sm" className="text-base" /> : null}
          {selectionLabel ? <span className="truncate text-xs text-muted-foreground">{selectionLabel}</span> : null}
        </div>
        <AddToCartButton
          action={addToCart}
          variantId={variant?.id}
          qty={qty}
          size="lg"
          disabled={!available}
          label={available ? undefined : t("unavailable")}
          accessibleName={available ? t("addNamed", { name }) : undefined}
          className="flex-1"
        />
      </div>
    </div>
  );
}
