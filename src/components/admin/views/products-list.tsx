"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { StatusBadge } from "@/components/status/status-badge";
import { Money } from "@/components/store/price";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PRODUCT_STATUSES, type AdminProductListDTO, type AdminProductRowDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { AdminDataTable } from "../admin-data-table";
import { FilterBar, type FilterOption } from "../filter-bar";
import { PRODUCT_SORTS } from "../list-params";
import { PageHeader } from "../page-header";
import { RowMenu } from "../row-menu";
import { Thumb } from "../thumb";

type Row = AdminProductRowDTO;

/** /admin/products (AdminProducts-desktop board). Filters/sort/paging in the URL -> the RSC page refetches. */
export function ProductsListView({
  list,
  categories,
  filtered,
}: {
  list: AdminProductListDTO;
  /** flat category options for the filter ("البشوت ← حساوي") */
  categories: FilterOption[];
  /** any filter or search is applied (empty = "no results" instead of "no products yet") */
  filtered: boolean;
}) {
  const t = useTranslations("admin.products");
  const tn = useTranslations("admin.nav");
  const ts = useTranslations("status.product");
  const tf = useTranslations("admin.filters");

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { id: "image", header: "", meta: { card: "media" }, cell: ({ row }) => <Thumb src={row.original.imageUrl} /> },
      {
        id: "name",
        header: t("colProduct"),
        meta: { card: "title" },
        cell: ({ row: { original: p } }) => (
          <span className="flex min-w-0 flex-col">
            <Link href={`/admin/products/${p.id}`} className="font-semibold text-foreground hover:underline">
              {p.nameAr}
            </Link>
            <span className="text-xs text-muted-foreground">{t("variantCount", { count: p.variantCount })}</span>
          </span>
        ),
      },
      {
        id: "vendor",
        header: t("colVendor"),
        cell: ({ row: { original: p } }) =>
          p.vendor ? (
            p.vendor.nameAr
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-gold-text">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              {t("platform")}
            </span>
          ),
      },
      { id: "category", header: t("colCategory"), cell: ({ row }) => row.original.category.nameAr },
      {
        id: "status",
        header: t("colStatus"),
        cell: ({ row: { original: p } }) => (
          <span className="inline-flex flex-wrap items-center gap-1">
            <StatusBadge entity="product" status={p.status} />
            {p.isFeatured ? (
              <Badge tone="accent" icon={false}>
                {t("featured")}
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        id: "price",
        header: t("colPrice"),
        meta: { numeric: true },
        cell: ({ row: { original: p } }) =>
          p.priceMin === p.priceMax ? (
            <Money halalas={p.priceMin} />
          ) : (
            <span>
              {t("from")} <Money halalas={p.priceMin} />
            </span>
          ),
      },
      {
        id: "stock",
        header: t("colStock"),
        meta: { numeric: true },
        cell: ({ row: { original: p } }) =>
          p.available <= 0 ? (
            <Badge tone="danger">{t("soldOut")}</Badge>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {p.available <= 3 ? (
                <Badge tone="warning" size="sm">
                  {t("low")}
                </Badge>
              ) : null}
              {p.available.toLocaleString("en-US")}
            </span>
          ),
      },
    ],
    [t],
  );

  const addButton = (
    <Link href="/admin/products/new" className={buttonVariants({ size: "dense" })}>
      <Plus aria-hidden="true" />
      {t("add")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("products") }]}
        description={t("description", { count: list.total })}
        actions={addButton}
      />
      <FilterBar
        controls="products-table"
        viewParam="status"
        views={[{ key: "all", label: tf("all") }, ...PRODUCT_STATUSES.map((s) => ({ key: s, label: ts(s) }))]}
        search={{ placeholder: t("searchPlaceholder") }}
        filters={[
          { param: "category", label: t("colCategory"), options: categories },
          {
            param: "vendor",
            label: t("colVendor"),
            options: [{ value: "platform", label: t("platform") }],
          },
          {
            param: "sort",
            label: t("sort"),
            options: PRODUCT_SORTS.map((s) => ({ value: s, label: t(`sorts.${s}`) })),
          },
        ]}
        resultCount={filtered ? list.total : undefined}
      />
      <AdminDataTable
        id="products-table"
        caption={t("caption")}
        columns={columns}
        data={list.items}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.nameAr}
        pagination={{ page: list.page, pageSize: list.perPage, total: list.total }}
        rowMenu={(p) => (
          <RowMenu
            label={t("rowActions", { name: p.nameAr })}
            items={[
              { kind: "link", label: p.editable ? t("edit") : t("view"), href: `/admin/products/${p.id}` },
              ...(p.status === "PUBLISHED"
                ? [{ kind: "link" as const, label: t("viewInStore"), href: `/p/${p.slug}` }]
                : []),
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
                  <Link href="/admin/products" className={buttonVariants({ variant: "outline" })}>
                    {tf("clear")}
                  </Link>
                }
              />
            ) : (
              <EmptyState variant="first-use" title={t("emptyTitle")} body={t("emptyBody")} action={addButton} />
            )}
          </div>
        }
      />
    </div>
  );
}
