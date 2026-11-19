"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Money } from "@/components/store/price";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdminCustomerListDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { AdminDataTable } from "../admin-data-table";
import { FilterBar } from "../filter-bar";
import { CUSTOMER_SORTS } from "../list-params";
import { maskPhone } from "../mask";
import { PageHeader } from "../page-header";

type Row = AdminCustomerListDTO["items"][number];

/** /admin/customers (AdminCustomers-desktop board), read only. Phones are masked (README 4.6). */
export function CustomersListView({ list, filtered }: { list: AdminCustomerListDTO; filtered: boolean }) {
  const t = useTranslations("admin.customers");
  const tn = useTranslations("admin.nav");
  const tf = useTranslations("admin.filters");
  const format = useFormatter();

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: "name",
        header: t("colCustomer"),
        meta: { card: "title" },
        cell: ({ row: { original: c } }) => (
          <Link href={`/admin/customers/${c.id}`} className="font-semibold text-foreground hover:underline">
            {c.name}
          </Link>
        ),
      },
      {
        id: "phone",
        header: t("colPhone"),
        cell: ({ row }) => (row.original.phone ? <bdi dir="ltr">{maskPhone(row.original.phone)}</bdi> : "—"),
      },
      { id: "orders", header: t("colOrders"), meta: { numeric: true }, cell: ({ row }) => row.original.ordersCount },
      {
        id: "spent",
        header: t("colSpent"),
        meta: { numeric: true },
        cell: ({ row }) => <Money halalas={row.original.totalSpent} />,
      },
      {
        id: "last",
        header: t("colLastOrder"),
        cell: ({ row }) =>
          row.original.lastOrderAt ? (
            format.relativeTime(new Date(row.original.lastOrderAt))
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "status",
        header: t("colStatus"),
        cell: ({ row }) => <CustomerStatus status={row.original.status} orders={row.original.ordersCount} />,
      },
    ],
    [t, format],
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("customers") }]}
        description={t("description")}
      />
      <FilterBar
        controls="customers-table"
        viewParam="status"
        views={[
          { key: "all", label: tf("all") },
          { key: "ACTIVE", label: t("active") },
          { key: "BLOCKED", label: t("blocked") },
        ]}
        search={{ placeholder: t("searchPlaceholder") }}
        filters={[
          {
            param: "sort",
            label: t("sort"),
            options: CUSTOMER_SORTS.map((s) => ({ value: s, label: t(`sorts.${s}`) })),
          },
        ]}
        resultCount={filtered ? list.total : undefined}
      />
      <AdminDataTable
        id="customers-table"
        caption={t("caption")}
        columns={columns}
        data={list.items}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.name}
        minWidth="48rem"
        pagination={{ page: list.page, pageSize: list.perPage, total: list.total }}
        empty={
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              variant={filtered ? "filtered" : "default"}
              title={filtered ? t("noResultsTitle") : t("emptyTitle")}
              body={filtered ? t("noResultsBody") : t("emptyBody")}
              action={
                <Link
                  href={filtered ? "/admin/customers" : "/admin"}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {filtered ? tf("clear") : t("backHome")}
                </Link>
              }
            />
          </div>
        }
      />
    </div>
  );
}

export function CustomerStatus({ status, orders }: { status: "ACTIVE" | "BLOCKED"; orders: number }) {
  const t = useTranslations("admin.customers");
  if (status === "BLOCKED") return <Badge tone="danger">{t("blocked")}</Badge>;
  return orders > 0 ? <Badge tone="success">{t("active")}</Badge> : <Badge tone="neutral">{t("noOrders")}</Badge>;
}
