"use client";

import { AlertTriangle, Lock, ShoppingBag, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "@/components/ui/toaster";
import type { CartDTO, CartLineDTO } from "@/features/cart/schema";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { RemoveLineAction, UpdateLineAction } from "./action-types";
import { BnplLine } from "./bnpl-line";
import { emitCartCount } from "./cart-events";
import { Money, Price } from "./price";
import { ProductImage } from "./product-image";

export function groupByStore(lines: CartLineDTO[]) {
  const groups = new Map<string, { vendor: CartLineDTO["vendor"]; lines: CartLineDTO[] }>();
  for (const l of lines) {
    const key = l.vendor?.slug ?? "";
    const g = groups.get(key) ?? { vendor: l.vendor, lines: [] };
    g.lines.push(l);
    groups.set(key, g);
  }
  // Souq AlZal's own shipment first, then stores in the order they appear.
  return [...groups.values()].sort((a, b) => (a.vendor ? 1 : 0) - (b.vendor ? 1 : 0));
}

/**
 * Cart (Cart-mobile, review 3.7): one ShipmentGroup per store (D3), CartLine with Stepper and
 * remove, notices for unavailable / above-stock lines, the summary and the checkout CTA (sticky on
 * mobile). The server computes every amount; the island only replaces its state with the CartDTO
 * each action returns (no optimistic money).
 */
export function CartView({
  initial,
  update,
  remove,
}: {
  initial: CartDTO;
  update: UpdateLineAction;
  remove: RemoveLineAction;
}) {
  const t = useTranslations("cart");
  const te = useTranslations("actionErrors");
  const locale = useLocale() as "ar" | "en";
  const [cart, setCart] = useState(initial);
  const [pendingLine, setPendingLine] = useState<string | null>(null);
  const [, start] = useTransition();

  const run = (lineId: string, fn: () => ReturnType<UpdateLineAction>, done?: string) => {
    setPendingLine(lineId);
    start(async () => {
      try {
        const res = await fn();
        if (res.ok) {
          setCart(res.data);
          emitCartCount(res.data.itemCount);
          if (done) toast.success(done);
        } else toast.error(te.has(res.code) ? te(res.code) : te("INTERNAL"));
      } catch {
        toast.error(te("NETWORK"));
      } finally {
        setPendingLine(null);
      }
    });
  };

  if (!cart.lines.length) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        body={t("emptyBody")}
        action={
          <Button asChild>
            <Link href="/products">{t("browse")}</Link>
          </Button>
        }
        className="rounded-lg bg-card"
      />
    );
  }

  const groups = groupByStore(cart.lines);
  return (
    <div className="grid grid-cols-1 gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:pb-0">
      <div className="flex flex-col gap-4">
        {cart.hasIssues ? (
          <Callout tone="warning" title={t("issuesTitle")}>
            {t("issuesBody")}
          </Callout>
        ) : null}
        {groups.map((g, gi) => (
          <section
            key={g.vendor?.slug ?? "souq"}
            aria-labelledby={`ship-${gi}`}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            <h2 id={`ship-${gi}`} className="text-base font-bold">
              {t("shipment", { n: gi + 1, total: groups.length })} ·{" "}
              {g.vendor ? t("byVendor", { name: g.vendor.name }) : t("byPlatform")}
            </h2>
            <ul role="list" className="flex flex-col divide-y divide-border">
              {g.lines.map((l) => (
                <li key={l.id} className="flex gap-3 py-3 first:pt-0 last:pb-0" aria-busy={pendingLine === l.id}>
                  <Link
                    href={l.kind === "BUNDLE" ? `/bundles/${l.slug}` : `/p/${l.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="w-20 shrink-0"
                  >
                    <ProductImage image={l.image} sizes="80px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h3 className="text-sm leading-snug font-semibold">
                      <Link
                        href={l.kind === "BUNDLE" ? `/bundles/${l.slug}` : `/p/${l.slug}`}
                        className="hover:underline"
                      >
                        {l.name}
                      </Link>
                    </h3>
                    {l.optionsLabel ? <p className="text-xs text-muted-foreground">{l.optionsLabel}</p> : null}
                    <Price halalas={l.unitPrice} compareAt={l.compareAtPrice} size="sm" />
                    {!l.available ? (
                      <p className="flex items-center gap-1 text-xs font-semibold text-danger">
                        <AlertTriangle aria-hidden="true" className="size-3.5" />
                        {t("lineUnavailable")}
                      </p>
                    ) : l.qtyExceedsStock ? (
                      <p className="flex items-center gap-1 text-xs font-semibold text-danger">
                        <AlertTriangle aria-hidden="true" className="size-3.5" />
                        {t("lineAboveStock", { max: l.maxQty })}
                      </p>
                    ) : l.stockLevel === "LOW" ? (
                      <p className="text-xs font-semibold text-danger">{t("lineLow")}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      {l.available ? (
                        <Stepper
                          value={l.qty}
                          min={1}
                          max={Math.max(l.qty, l.maxQty)}
                          disabled={pendingLine === l.id}
                          onChange={(q) => run(l.id, () => update({ lineId: l.id, qty: q, locale }))}
                          label={t("qtyFor", { name: l.name })}
                          decreaseLabel={t("qtyDecrease")}
                          increaseLabel={t("qtyIncrease")}
                        />
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-1">
                        {l.qtyExceedsStock && l.maxQty > 0 ? (
                          <Button
                            variant="link"
                            disabled={pendingLine === l.id}
                            onClick={() => run(l.id, () => update({ lineId: l.id, qty: l.maxQty, locale }))}
                          >
                            {t("reduceTo", { max: l.maxQty })}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("remove", { name: l.name })}
                          disabled={pendingLine === l.id}
                          onClick={() => run(l.id, () => remove({ lineId: l.id, locale }), t("removed"))}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className={cn("shrink-0 self-start text-sm font-bold", !l.available && "text-muted-foreground")}>
                    <span className="sr-only">{t("lineTotal")} </span>
                    <Money halalas={l.lineTotal} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside
        aria-labelledby="summary-title"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-4"
      >
        <h2 id="summary-title" className="text-lg font-bold">
          {t("summary")}
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("items", { count: cart.itemCount })}</dt>
            <dd className="font-semibold">
              <Money halalas={cart.subtotal} />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("shipping")}</dt>
            <dd>{t("shippingNext")}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-bold">
            <dt>{t("total")}</dt>
            <dd>
              <Money halalas={cart.subtotal} />
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {t.rich("vatIncluded", { amount: () => <Money halalas={cart.vatIncluded} /> })}
        </p>
        <BnplLine />
        <CheckoutCta disabled={cart.hasIssues || cart.itemCount === 0} className="hidden lg:inline-flex" />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" />
          {t("secure")}
        </p>
      </aside>

      <div
        data-sticky-action-bar=""
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex items-center gap-3 border-t border-border bg-card px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-md lg:hidden"
      >
        <CheckoutCta disabled={cart.hasIssues || cart.itemCount === 0} amount={cart.subtotal} className="flex-1" />
      </div>
    </div>
  );
}

function CheckoutCta({ disabled, amount, className }: { disabled: boolean; amount?: number; className?: string }) {
  const t = useTranslations("cart");
  if (disabled) {
    return (
      <Button size="lg" disabled className={cn("w-full", className)}>
        <ShoppingBag aria-hidden="true" />
        {t("checkout")}
      </Button>
    );
  }
  return (
    <Button asChild size="lg" className={cn("w-full", className)}>
      <Link href="/checkout">
        <ShoppingBag aria-hidden="true" />
        {t("checkout")}
        {amount != null ? (
          <>
            {" · "}
            <Money halalas={amount} />
          </>
        ) : null}
      </Link>
    </Button>
  );
}
