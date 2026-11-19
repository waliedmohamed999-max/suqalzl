"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { StatusBadge } from "@/components/status/status-badge";
import { Money } from "@/components/store/price";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdminOrderListDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { AdminDataTable } from "../admin-data-table";
import { FilterBar } from "../filter-bar";
import { PageHeader } from "../page-header";
import { RowMenu } from "../row-menu";

type Row = AdminOrderListDTO["items"][number];

export const ORDER_VIEWS = [
  "PAID",
  "PROCESSING",
  "PENDING_PAYMENT",
  "COMPLETED",
  "CANCELLED",
  "PAID_NEEDS_REVIEW",
] as const;
export const ORDER_PERIODS = ["7d", "30d", "90d"] as const;
const PAYMENT_FILTER = ["PAID", "INITIATED", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

/** /admin/orders (AdminOrders-desktop board), read only in M1. */
export function OrdersListView({ list, filtered }: { list: AdminOrderListDTO; filtered: boolean }) {
  const t = useTranslations("admin.orders");
  const tn = useTranslations("admin.nav");
  const tf = useTranslations("admin.filters");
  const tso = useTranslations("status.order");
  const tsp = useTranslations("status.payment");
  const format = useFormatter();

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: "number",
        header: t("colOrder"),
        meta: { card: "title" },
        cell: ({ row: { original: o } }) => (
          <Link href={`/admin/orders/${o.id}`} className="font-bold text-foreground hover:underline">
            <bdi dir="ltr">{o.number}</bdi>
          </Link>
        ),
      },
      {
        id: "customer",
        header: t("colCustomer"),
        cell: ({ row: { original: o } }) => (
          <span className="flex flex-col">
            <span>{o.customer.name}</span>
            {o.city ? <span className="text-xs text-muted-foreground">{o.city}</span> : null}
          </span>
        ),
      },
      { id: "subs", header: t("colShipments"), meta: { numeric: true }, cell: ({ row }) => row.original.subOrderCount },
      {
        id: "payment",
        header: t("colPayment"),
        cell: ({ row }) => <StatusBadge entity="payment" status={row.original.paymentStatus} />,
      },
      {
        id: "status",
        header: t("colStatus"),
        cell: ({ row }) => <StatusBadge entity="order" status={row.original.status} />,
      },
      {
        id: "total",
        header: t("colTotal"),
        meta: { numeric: true },
        cell: ({ row }) => <Money halalas={row.original.grandTotal} />,
      },
      { id: "method", header: t("colMethod"), cell: ({ row }) => t(`methods.${row.original.paymentMethod}`) },
      {
        id: "date",
        header: t("colDate"),
        cell: ({ row }) => (
          <time dateTime={row.original.placedAt} className="text-xs whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.placedAt), { dateStyle: "medium", timeStyle: "short" })}
          </time>
        ),
      },
    ],
    [t, format],
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("orders") }]}
        description={t("description")}
      />
      <FilterBar
        controls="orders-table"
        viewParam="status"
        views={[{ key: "all", label: tf("all") }, ...ORDER_VIEWS.map((s) => ({ key: s, label: tso(s) }))]}
        search={{ placeholder: t("searchPlaceholder") }}
        filters={[
          {
            param: "payment",
            label: t("colPayment"),
            options: PAYMENT_FILTER.map((s) => ({ value: s, label: tsp(s) })),
          },
          {
            param: "period",
            label: t("period"),
            options: ORDER_PERIODS.map((p) => ({ value: p, label: t(`periods.${p}`) })),
          },
        ]}
        resultCount={filtered ? list.total : undefined}
      />
      <AdminDataTable
        id="orders-table"
        caption={t("caption")}
        columns={columns}
        data={list.items}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.number}
        pagination={{ page: list.page, pageSize: list.perPage, total: list.total }}
        rowMenu={(o) => (
          <RowMenu
            label={t("rowActions", { number: o.number })}
            items={[
              { kind: "link", label: t("open"), href: `/admin/orders/${o.id}` },
              { kind: "link", label: t("customer"), href: `/admin/customers/${o.customer.id}` },
            ]}
          />
        )}
        empty={
          <div className="rounded-lg border border-border bg-card">
            {filtered ? (
              <EmptyState
                variant="filtered"
                title={t("noResultsTitle")}
                body={t("noResultsBody")}
                action={
                  <Link href="/admin/orders" className={buttonVariants({ variant: "outline" })}>
                    {tf("clear")}
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title={t("emptyTitle")}
                body={t("emptyBody")}
                action={
                  <Link href="/admin/products" className={buttonVariants({ variant: "outline" })}>
                    {t("emptyAction")}
                  </Link>
                }
              />
            )}
          </div>
        }
      />
    </div>
  );
}
