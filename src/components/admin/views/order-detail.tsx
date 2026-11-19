import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/status/status-badge";
import { Money } from "@/components/store/price";
import type { AdminOrderDetailDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { AdminCard, KeyValue } from "../admin-card";
import { maskPhone } from "../mask";
import { PageHeader } from "../page-header";
import { DetailLayout } from "../states";
import { StatusTimeline } from "../status-timeline";
import { Thumb } from "../thumb";

type SubOrder = AdminOrderDetailDTO["subOrders"][number];

const pct = (bps: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(bps / 100)}%`;

/**
 * /admin/orders/[id] (AdminOrder-desktop board), read only in M1: one card per sub-order (lines,
 * totals, commission, shipments, timeline newest first) + payment, customer and address cards.
 * Status changes, manual shipping, refunds and the invoice arrive in P3-01 / P2-03 / P3-02.
 */
export function OrderDetailView({ order }: { order: AdminOrderDetailDTO }) {
  const t = useTranslations("admin.orderDetail");
  const tn = useTranslations("admin.nav");
  const to = useTranslations("admin.orders");
  const format = useFormatter();
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={
          <>
            {t("title")} <bdi dir="ltr">{order.number}</bdi>
          </>
        }
        breadcrumbs={[
          { label: tn("root"), href: "/admin" },
          { label: tn("orders"), href: "/admin/orders" },
          { label: order.number },
        ]}
        status={
          <span className="flex flex-wrap gap-1.5">
            <StatusBadge entity="payment" status={order.paymentStatus} />
            <StatusBadge entity="order" status={order.status} />
          </span>
        }
        description={t("subtitle", { date: when(order.placedAt), count: order.subOrders.length })}
      />
      <DetailLayout
        main={order.subOrders.map((s) => (
          <SubOrderCard key={s.id} sub={s} />
        ))}
        side={
          <>
            <AdminCard title={t("payment")}>
              <dl className="flex flex-col gap-1.5 text-sm">
                <Line label={t("subtotal")} value={<Money halalas={order.subtotal} />} />
                <Line label={t("shipping")} value={<Money halalas={order.shippingTotal} />} />
                <Line
                  label={order.couponCode ? t("discountCode", { code: order.couponCode }) : t("discount")}
                  value={order.discountTotal ? <Money halalas={-order.discountTotal} /> : "—"}
                />
                <div className="my-1 border-t border-border" />
                <Line strong label={t("total")} value={<Money halalas={order.grandTotal} />} />
                <Line muted label={t("vatIncluded")} value={<Money halalas={order.vatTotal} />} />
              </dl>
              <KeyValue
                rows={[
                  { label: t("method"), value: to(`methods.${order.paymentMethod}`) },
                  { label: t("paidAt"), value: order.paidAt ? when(order.paidAt) : "—" },
                  { label: t("invoiceType"), value: t(`invoiceTypes.${order.invoiceType}`) },
                ]}
              />
              {order.payments.length ? (
                <ul aria-label={t("transactions")} className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span dir="ltr">{p.gateway}</span>
                      <span className="text-muted-foreground">{p.status}</span>
                      <Money halalas={p.amount} />
                      {p.refundedAmount ? (
                        <span className="w-full text-xs text-muted-foreground">
                          {t("refunded")} <Money halalas={p.refundedAmount} />
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </AdminCard>
            <AdminCard title={t("customer")}>
              <KeyValue
                rows={[
                  {
                    label: t("name"),
                    value: (
                      <Link href={`/admin/customers/${order.customer.id}`} className="font-semibold underline">
                        {order.customer.name}
                      </Link>
                    ),
                  },
                  {
                    label: t("phone"),
                    value: order.customer.phone ? <bdi dir="ltr">{maskPhone(order.customer.phone)}</bdi> : "—",
                  },
                ]}
              />
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <strong className="text-sm">{t("address")}</strong>
                <p className="text-sm text-foreground-secondary">
                  {order.address.recipientName} · {order.address.city}، {order.address.district}، {order.address.street}
                  {order.address.buildingNo ? `، ${t("building", { no: order.address.buildingNo })}` : ""}
                  {order.address.nationalAddressShort ? (
                    <>
                      {" · "}
                      <bdi dir="ltr">{order.address.nationalAddressShort}</bdi>
                    </>
                  ) : null}
                </p>
              </div>
            </AdminCard>
          </>
        }
      />
    </div>
  );
}

function SubOrderCard({ sub }: { sub: SubOrder }) {
  const t = useTranslations("admin.orderDetail");
  const tk = useTranslations("admin.kit");
  const format = useFormatter();
  return (
    <AdminCard
      title={
        <>
          <bdi dir="ltr">{sub.number}</bdi> · {sub.vendor?.nameAr ?? t("platform")}
        </>
      }
      action={<StatusBadge entity="subOrder" status={sub.status} />}
    >
      <ul className="flex flex-col">
        {sub.lines.map((l) => (
          <li key={l.id} className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
            <Thumb src={l.imageUrl} size={40} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold">{l.name}</span>
              <span className="text-xs text-muted-foreground">
                {l.sku ? <bdi dir="ltr">{l.sku}</bdi> : null}
                {l.sku && l.optionsLabel ? " · " : null}
                {l.optionsLabel}
              </span>
            </span>
            <span className="text-sm whitespace-nowrap">
              × <bdi dir="ltr">{l.qty}</bdi>
            </span>
            <Money halalas={l.lineTotal} className="text-sm" />
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <Stat label={t("items")} value={<Money halalas={sub.itemsGross} />} />
        <Stat label={t("shipping")} value={<Money halalas={sub.shippingFee} />} />
        <Stat
          label={t("commission", { rate: pct(sub.commissionRate) })}
          value={<Money halalas={sub.commissionAmount} />}
        />
        <Stat label={t("vendorPayable")} value={<Money halalas={sub.vendorPayable} />} />
      </dl>
      {sub.shipments.length ? (
        <ul aria-label={t("shipments")} className="flex flex-col gap-1 text-sm">
          {sub.shipments.map((s) => (
            <li key={s.id} className="text-foreground-secondary">
              {s.carrier ?? t("carrierUnknown")}
              {s.trackingNumber ? (
                <>
                  {" · "}
                  <bdi dir="ltr">{s.trackingNumber}</bdi>
                </>
              ) : null}
              {" · "}
              {format.dateTime(new Date(s.createdAt), { dateStyle: "medium" })}
            </li>
          ))}
        </ul>
      ) : null}
      <details open className="border-t border-border pt-2">
        <summary className="min-h-9 cursor-pointer text-sm font-semibold text-foreground-secondary">
          {tk("timeline")}
        </summary>
        <StatusTimeline
          className="pt-2"
          label={t("timelineOf", { number: sub.number })}
          events={[...sub.timeline]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((e, i) => ({
              id: `${e.at}-${i}`,
              status: <StatusBadge entity="subOrder" status={e.to} />,
              actor: e.by?.name ?? null,
              at: e.at,
              note: e.note,
            }))}
        />
      </details>
    </AdminCard>
  );
}

function Line({ label, value, strong, muted }: { label: string; value: ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-2 ${strong ? "text-base font-bold" : ""} ${muted ? "text-xs text-muted-foreground" : ""}`}
    >
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
