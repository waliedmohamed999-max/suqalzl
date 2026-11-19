"use client";

import { MapPin, Plus, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Skeleton } from "@/components/ui/skeleton";
import type { AddressDTO, AddressInput, CheckoutAddressStepDTO, ShippingQuoteDTO } from "@/features/cart/schema";
import type { ActionResult, ErrorCode } from "@/features/common/schema";
import { Link } from "@/i18n/navigation";
import { formatSaudiMobile } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { AddressForm } from "./address-form";
import { Money } from "./price";
import { ProductImage } from "./product-image";

export type SaveAddressAction = (input: AddressInput) => Promise<ActionResult<AddressDTO>>;
export type ShippingQuoteAction = (input: {
  addressId: string;
  locale: "ar" | "en";
}) => Promise<ActionResult<ShippingQuoteDTO>>;

export function addressLine(a: Pick<AddressDTO, "city" | "district" | "street" | "buildingNo">) {
  return [a.city.name, a.district, a.street, a.buildingNo].filter(Boolean).join("، ");
}

/**
 * Checkout step 1 (Checkout-desktop): choose or add an address, then one shipment per store with
 * its fee and ETA from the server quote (ShippingZone, D17: no carrier choice for the customer),
 * and the totals. M1: payment (P2-03) is not available, so step 2 is announced, not offered.
 */
export function CheckoutAddressStep({
  step,
  saveAddress,
  quote,
}: {
  step: CheckoutAddressStepDTO;
  saveAddress: SaveAddressAction;
  quote: ShippingQuoteAction;
}) {
  const t = useTranslations("checkout");
  const te = useTranslations("actionErrors");
  const locale = useLocale() as "ar" | "en";
  const [addresses, setAddresses] = useState(step.addresses);
  const [selected, setSelected] = useState<string | null>(step.selectedAddressId ?? step.addresses[0]?.id ?? null);
  const [adding, setAdding] = useState(step.addresses.length === 0);
  const [q, setQ] = useState<ShippingQuoteDTO | null>(null);
  const [qError, setQError] = useState<ErrorCode | "NETWORK" | null>(null);
  const [loading, start] = useTransition();

  useEffect(() => {
    if (!selected) return;
    setQError(null);
    start(async () => {
      try {
        const res = await quote({ addressId: selected, locale });
        if (res.ok) setQ(res.data);
        else {
          setQ(null);
          setQError(res.code);
        }
      } catch {
        setQ(null);
        setQError("NETWORK");
      }
    });
  }, [selected, quote, locale]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="flex flex-col gap-5">
        <section
          aria-labelledby="addr-title"
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <h2 id="addr-title" className="flex items-center gap-2 text-lg font-bold">
            <MapPin aria-hidden="true" className="size-5" />
            {t("addressTitle")}
          </h2>
          {addresses.length ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{t("chooseAddress")}</legend>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    selected === a.id ? "border-2 border-border-strong" : "border-border",
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    value={a.id}
                    checked={selected === a.id}
                    onChange={() => setSelected(a.id)}
                    className="mt-1 size-5 shrink-0 accent-primary"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                    <strong className="text-base">{a.label ?? a.recipientName}</strong>
                    <span>
                      {a.recipientName} · <bdi dir="ltr">{formatSaudiMobile(a.recipientPhone)}</bdi>
                    </span>
                    <span className="text-muted-foreground">{addressLine(a)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          {adding ? (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              <h3 className="text-base font-bold">{t("newAddress")}</h3>
              <AddressForm
                cities={step.cities}
                submit={saveAddress}
                submitLabel={t("saveAndUse")}
                onCancel={addresses.length ? () => setAdding(false) : undefined}
                onSuccess={(a) => {
                  setAddresses((list) => [...list.filter((x) => x.id !== a.id), a]);
                  setSelected(a.id);
                  setAdding(false);
                }}
              />
            </div>
          ) : (
            <Button variant="outline" onClick={() => setAdding(true)} className="self-start">
              <Plus aria-hidden="true" />
              {t("addAddress")}
            </Button>
          )}
        </section>

        <section
          aria-labelledby="ship-title"
          aria-busy={loading}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <h2 id="ship-title" className="flex items-center gap-2 text-lg font-bold">
            <Truck aria-hidden="true" className="size-5" />
            {t("shipmentsTitle")}
          </h2>
          {!selected ? (
            <p className="text-sm text-muted-foreground">{t("pickAddressFirst")}</p>
          ) : loading && !q ? (
            <div className="flex flex-col gap-2">
              <Skeleton shape="row" />
              <Skeleton shape="row" />
            </div>
          ) : qError ? (
            <Callout tone="danger" title={t("quoteErrorTitle")}>
              {te.has(qError) ? te(qError) : te("INTERNAL")}
            </Callout>
          ) : q ? (
            <ul role="list" className="flex flex-col divide-y divide-border">
              {q.shipments.map((s, i) => {
                const lines = step.cart.lines.filter(
                  (l) => (l.vendor?.slug ?? null) === (s.vendor?.slug ?? null) && l.available,
                );
                return (
                  <li key={s.vendor?.slug ?? "souq"} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold">
                        {t("shipment", { n: i + 1 })} ·{" "}
                        {s.vendor ? t("byVendor", { name: s.vendor.name }) : t("byPlatform")}
                      </h3>
                      <span className="text-sm font-semibold">
                        {s.freeShipping || s.fee === 0 ? t("freeShipping") : <Money halalas={s.fee} />}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{t("eta", { days: s.etaDays })}</p>
                    {lines.length ? (
                      <ul className="flex gap-2" aria-label={t("shipmentItems")}>
                        {lines.slice(0, 5).map((l) => (
                          <li key={l.id} className="w-12">
                            <ProductImage image={l.image ? { ...l.image, alt: l.name } : null} sizes="48px" />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>

      <aside
        aria-labelledby="co-summary"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-4"
      >
        <h2 id="co-summary" className="text-lg font-bold">
          {t("summary")}
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("items", { count: step.cart.itemCount })}</dt>
            <dd className="font-semibold">
              <Money halalas={q?.subtotal ?? step.cart.subtotal} />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("shipping")}</dt>
            <dd className="font-semibold">{q ? <Money halalas={q.shippingTotal} /> : t("shippingPending")}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-bold">
            <dt>{t("total")}</dt>
            <dd>
              <Money halalas={q?.grandTotal ?? step.cart.subtotal} />
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {t.rich("vatIncluded", { amount: () => <Money halalas={q?.vatIncluded ?? step.cart.vatIncluded} /> })}
        </p>
        <Callout tone="info" title={t("paymentSoonTitle")}>
          {t("paymentSoonBody")}
        </Callout>
        <Button size="lg" disabled className="w-full">
          {t("continueToPayment")}
        </Button>
        <Button asChild variant="link" className="self-center">
          <Link href="/cart">{t("backToCart")}</Link>
        </Button>
      </aside>
    </div>
  );
}
