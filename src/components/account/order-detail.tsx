import { BadgeCheck, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Money } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import { StatusBadge } from "@/components/status/status-badge";
import type { CustomerOrderDetailDTO } from "@/features/orders/schema";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/date";
import { formatSaudiMobile } from "@/lib/phone";
import { StatusTimeline } from "./status-timeline";

/**
 * Order details (AccountOrder-mobile): header (date, shipments, order + payment status), one card
 * per shipment (store, status, lines, carrier + tracking number as entered manually, D17, and the
 * timeline in a <details>), the payment summary and the delivery address. Read only in M1.
 */
export function OrderDetail({ order }: { order: CustomerOrderDetailDTO }) {
  const t = useTranslations("accountArea.order");
  const tm = useTranslations("checkout.methods");
  const locale = useLocale();
  const a = order.address;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {formatDate(order.placedAt, locale)} · {t("shipments", { count: order.subOrders.length })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge entity="order" status={order.status} />
            <StatusBadge entity="payment" status={order.paymentStatus} />
          </div>
        </div>

        {order.subOrders.map((s, i) => {
          const tracking = s.shipments.find((x) => x.carrier || x.trackingNumber);
          return (
            <section
              key={s.id}
              aria-labelledby={`so-${s.id}`}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`so-${s.id}`} className="inline-flex items-center gap-1.5 text-base font-bold">
                  {t("shipment", { n: i + 1 })} ·{" "}
                  {s.vendor ? (
                    t("byVendor", { name: s.vendor.name })
                  ) : (
                    <>
                      <BadgeCheck aria-hidden="true" className="size-4 text-gold-text" />
                      {t("byPlatform")}
                    </>
                  )}
                </h2>
                <StatusBadge entity="subOrder" status={s.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("subNumber")} <bdi dir="ltr">{s.number}</bdi>
              </p>
              <ul role="list" className="flex flex-col gap-3">
                {s.lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-3">
                    <span className="w-13 shrink-0">
                      <ProductImage image={l.image} sizes="52px" className="rounded-sm" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      {l.productSlug ? (
                        <Link href={`/p/${l.productSlug}`} className="text-sm font-semibold hover:underline">
                          {l.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold">{l.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {l.optionsLabel ? `${l.optionsLabel} · ` : ""}
                        {t("qty", { qty: l.qty })}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">
                      <Money halalas={l.lineTotal} />
                    </span>
                  </li>
                ))}
              </ul>
              {tracking ? (
                <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Truck aria-hidden="true" className="size-4" />
                    {t("tracking")}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{tracking.carrier ?? t("carrierUnknown")}</span>
                    {tracking.trackingNumber ? (
                      <span>
                        <span className="sr-only">{t("trackingNumber")} </span>
                        <bdi dir="ltr" className="font-semibold">
                          {tracking.trackingNumber}
                        </bdi>
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {s.timeline.length ? (
                <details open={i === 0} className="group">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-foreground-secondary">
                    {t("timeline")}
                  </summary>
                  <div className="pt-1">
                    <StatusTimeline events={s.timeline} label={t("timelineFor", { n: i + 1 })} />
                  </div>
                </details>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-4">
        <section aria-labelledby="pay-sum" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <h2 id="pay-sum" className="text-base font-bold">
            {t("paymentSummary")}
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("subtotal")}</dt>
              <dd className="font-semibold">
                <Money halalas={order.subtotal} />
              </dd>
            </div>
            {order.discountTotal > 0 ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t("discount")}
                  {order.couponCode ? (
                    <>
                      {" "}
                      (<bdi dir="ltr">{order.couponCode}</bdi>)
                    </>
                  ) : null}
                </dt>
                <dd className="font-semibold">
                  <Money halalas={-order.discountTotal} />
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("shipping")}</dt>
              <dd className="font-semibold">
                <Money halalas={order.shippingTotal} />
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-bold">
              <dt>{t("total")}</dt>
              <dd>
                <Money halalas={order.grandTotal} />
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {t.rich("vat", { amount: () => <Money halalas={order.vatTotal} /> })} · {tm(order.paymentMethod)}
          </p>
        </section>
        <section
          aria-labelledby="ship-to"
          className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4"
        >
          <h2 id="ship-to" className="text-base font-bold">
            {t("address")}
          </h2>
          <p className="text-sm text-foreground-secondary">
            {a.recipientName} · <bdi dir="ltr">{formatSaudiMobile(a.recipientPhone)}</bdi>
          </p>
          <p className="text-sm text-foreground-secondary">
            {[a.city, a.district, a.street, a.buildingNo, a.postalCode].filter(Boolean).join("، ")}
            {a.nationalAddressShort ? (
              <>
                {" · "}
                <bdi dir="ltr">{a.nationalAddressShort}</bdi>
              </>
            ) : null}
          </p>
        </section>
      </div>
    </div>
  );
}
