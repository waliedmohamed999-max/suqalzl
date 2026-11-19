"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { AuditLogListDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AdminDataTable } from "../admin-data-table";
import { Drawer } from "../drawer";
import { FilterBar } from "../filter-bar";
import { PageHeader } from "../page-header";

type Row = AuditLogListDTO["items"][number];
export const AUDIT_PERIODS = ["today", "7d", "30d", "90d"] as const;

const json = (v: unknown) => (v === null || v === undefined ? "—" : JSON.stringify(v, null, 2));

/**
 * /admin/audit (AdminAudit-desktop board): read only, nothing can be edited or deleted. Filters in
 * the URL; "عرض التغيير" opens the before/after (already redacted on write) in a Drawer.
 */
export function AuditView({
  list,
  filtered,
  entities,
}: {
  list: AuditLogListDTO;
  filtered: boolean;
  entities: string[];
}) {
  const t = useTranslations("admin.audit");
  const tn = useTranslations("admin.nav");
  const tf = useTranslations("admin.filters");
  const format = useFormatter();
  const [open, setOpen] = useState<Row | null>(null);

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: "time",
        header: t("colTime"),
        cell: ({ row }) => (
          <time dateTime={row.original.createdAt} className="text-xs whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), { dateStyle: "medium", timeStyle: "short" })}
          </time>
        ),
      },
      {
        id: "actor",
        header: t("colActor"),
        cell: ({ row: { original: r } }) => (
          <span className="flex flex-col">
            <span>{r.actor?.name ?? t("system")}</span>
            {r.actorRole ? <span className="text-xs text-muted-foreground">{r.actorRole}</span> : null}
          </span>
        ),
      },
      {
        id: "action",
        header: t("colAction"),
        meta: { card: "title" },
        cell: ({ row }) => (
          <Badge tone="neutral" icon={false}>
            <bdi dir="ltr">{row.original.action}</bdi>
          </Badge>
        ),
      },
      {
        id: "entity",
        header: t("colEntity"),
        cell: ({ row: { original: r } }) => (
          <bdi dir="ltr" className="text-sm">
            {r.entity}
            {r.entityId ? <span className="text-muted-foreground"> · {r.entityId}</span> : null}
          </bdi>
        ),
      },
      {
        id: "ip",
        header: "IP",
        cell: ({ row }) => (
          <bdi dir="ltr" className="text-xs text-muted-foreground">
            {row.original.ip ?? "—"}
          </bdi>
        ),
      },
      {
        id: "diff",
        header: "",
        meta: { label: t("colChange") },
        cell: ({ row }) => (
          <Button variant="ghost" size="dense" onClick={() => setOpen(row.original)}>
            {t("viewChange")}
          </Button>
        ),
      },
    ],
    [t, format],
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("audit") }]}
        description={t("description")}
      />
      <FilterBar
        search={{ placeholder: t("searchPlaceholder"), param: "entityId" }}
        filters={[
          { param: "entity", label: t("colEntity"), options: entities.map((e) => ({ value: e, label: e })) },
          {
            param: "period",
            label: t("period"),
            options: AUDIT_PERIODS.map((p) => ({ value: p, label: t(`periods.${p}`) })),
          },
        ]}
        resultCount={filtered ? list.total : undefined}
      />
      <AdminDataTable
        caption={t("caption")}
        columns={columns}
        data={list.items}
        getRowId={(r) => r.id}
        rowLabel={(r) => `${r.action} ${r.entity}`}
        pagination={{ page: list.page, pageSize: list.perPage, total: list.total }}
        empty={
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              variant={filtered ? "filtered" : "default"}
              title={filtered ? t("noResultsTitle") : t("emptyTitle")}
              body={filtered ? t("noResultsBody") : t("emptyBody")}
              action={
                <Link href={filtered ? "/admin/audit" : "/admin"} className={buttonVariants({ variant: "outline" })}>
                  {filtered ? tf("clear") : t("backHome")}
                </Link>
              }
            />
          </div>
        }
      />
      <Drawer
        open={open != null}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open ? t("changeTitle", { action: open.action }) : ""}
        description={open ? `${open.entity}${open.entityId ? ` · ${open.entityId}` : ""}` : undefined}
      >
        {open ? (
          <div className="grid gap-3">
            <section className="rounded-md bg-danger-subtle p-3">
              <h3 className="text-xs font-bold text-danger">{t("before")}</h3>
              <pre dir="ltr" className="mt-1.5 overflow-x-auto font-sans text-sm whitespace-pre-wrap">
                {json(open.before)}
              </pre>
            </section>
            <section className="rounded-md bg-success-subtle p-3">
              <h3 className="text-xs font-bold text-success">{t("after")}</h3>
              <pre dir="ltr" className="mt-1.5 overflow-x-auto font-sans text-sm whitespace-pre-wrap">
                {json(open.after)}
              </pre>
            </section>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
