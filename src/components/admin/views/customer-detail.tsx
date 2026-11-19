import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/status/status-badge";
import { Money } from "@/components/store/price";
import type { AdminCustomerDetailDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { divRoundHalfUp } from "@/lib/money";
import { AdminCard, KeyValue } from "../admin-card";
import { maskEmail, maskPhone } from "../mask";
import { PageHeader } from "../page-header";
import { StatCard } from "../stat-card";
import { DetailLayout } from "../states";
import { CustomerStatus } from "./customers";

/** /admin/customers/[id] (AdminCustomer-desktop board), read only in M1. */
export function CustomerDetailView({ customer: c }: { customer: AdminCustomerDetailDTO }) {
  const t = useTranslations("admin.customerDetail");
  const tc = useTranslations("admin.customers");
  const tn = useTranslations("admin.nav");
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  const avg = c.ordersCount ? divRoundHalfUp(c.totalSpent, c.ordersCount) : 0;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={c.name}
        breadcrumbs={[
          { label: tn("root"), href: "/admin" },
          { label: tn("customers"), href: "/admin/customers" },
          { label: c.name },
        ]}
        status={<CustomerStatus status={c.status} orders={c.ordersCount} />}
        description={t("subtitle", { date: date(c.createdAt) })}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("orders")} value={c.ordersCount.toLocaleString("en-US")} />
        <StatCard label={t("spent")} value={<Money halalas={c.totalSpent} />} />
        <StatCard label={t("average")} value={<Money halalas={avg} />} />
      </div>
      <DetailLayout
        main={
          <AdminCard title={t("recentOrders")}>
            {c.recentOrders.length ? (
              <table className="w-full text-sm">
                <caption className="sr-only">{t("recentOrders")}</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="pb-1 text-start font-semibold">
                      {t("colOrder")}
                    </th>
                    <th scope="col" className="pb-1 text-start font-semibold">
                      {t("colDate")}
                    </th>
                    <th scope="col" className="pb-1 text-start font-semibold">
                      {t("colStatus")}
                    </th>
                    <th scope="col" className="pb-1 text-end font-semibold">
                      {t("colTotal")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <th scope="row" className="py-2 text-start font-semibold">
                        <Link href={`/admin/orders/${o.id}`} className="underline">
                          <bdi dir="ltr">{o.number}</bdi>
                        </Link>
                      </th>
                      <td className="py-2">{date(o.placedAt)}</td>
                      <td className="py-2">
                        <StatusBadge entity="order" status={o.status} />
                      </td>
                      <td className="py-2 text-end">
                        <Money halalas={o.grandTotal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
            )}
          </AdminCard>
        }
        side={
          <>
            <AdminCard title={t("profile")}>
              <KeyValue
                rows={[
                  { label: tc("colPhone"), value: c.phone ? <bdi dir="ltr">{maskPhone(c.phone)}</bdi> : "—" },
                  { label: t("email"), value: c.email ? <bdi dir="ltr">{maskEmail(c.email)}</bdi> : "—" },
                  { label: t("language"), value: t(`locales.${c.locale}`) },
                  { label: t("lastLogin"), value: c.lastLoginAt ? date(c.lastLoginAt) : "—" },
                  { label: t("since"), value: date(c.createdAt) },
                ]}
              />
              <p className="text-xs text-muted-foreground">{t("maskNote")}</p>
            </AdminCard>
            <AdminCard title={t("addresses", { count: c.addresses.length })}>
              {c.addresses.length ? (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {c.addresses.map((a) => (
                    <li key={a.id}>
                      {a.label ? `${a.label} · ` : ""}
                      {a.city}، {a.district}
                      {a.isDefault ? <span className="text-muted-foreground"> ({t("default")})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noAddresses")}</p>
              )}
            </AdminCard>
          </>
        }
      />
    </div>
  );
}
