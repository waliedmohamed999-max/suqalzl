"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { AdminStaffListDTO } from "@/features/admin/schema";
import { AdminCard } from "../admin-card";
import { AdminDataTable } from "../admin-data-table";
import { PageHeader } from "../page-header";

type Row = AdminStaffListDTO["staff"][number];

/**
 * /admin/staff (AdminStaff-desktop board), READ ONLY in M1 and SUPER_ADMIN only (D36-6): the
 * team, roles and each person's permissions. Invites and permission edits arrive in P3-01.
 */
export function StaffView({ data }: { data: AdminStaffListDTO }) {
  const t = useTranslations("admin.staff");
  const tp = useTranslations("admin.permissions");
  const tn = useTranslations("admin.nav");
  const format = useFormatter();

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: "member",
        header: t("colMember"),
        meta: { card: "title" },
        cell: ({ row: { original: s } }) => (
          <span className="flex flex-col">
            <span className="font-semibold">
              {s.name}
              {s.isSelf ? <span className="font-normal text-muted-foreground"> ({t("you")})</span> : null}
            </span>
            {s.email ? (
              <bdi dir="ltr" className="text-xs font-normal text-muted-foreground">
                {s.email}
              </bdi>
            ) : null}
          </span>
        ),
      },
      {
        id: "role",
        header: t("colRole"),
        cell: ({ row }) => (
          <Badge tone={row.original.role === "SUPER_ADMIN" ? "accent" : "neutral"}>
            {t(`roles.${row.original.role}`)}
          </Badge>
        ),
      },
      {
        id: "permissions",
        header: t("colPermissions"),
        cell: ({ row: { original: s } }) =>
          s.role === "SUPER_ADMIN" ? (
            t("allPermissions")
          ) : s.permissions.length ? (
            <ul className="flex flex-wrap gap-1">
              {s.permissions.map((p) => (
                <li key={p}>
                  <Badge tone="neutral" size="sm" icon={false}>
                    {tp(p)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">{t("noPermissions")}</span>
          ),
      },
      {
        id: "lastLogin",
        header: t("colLastLogin"),
        cell: ({ row }) =>
          row.original.lastLoginAt
            ? format.dateTime(new Date(row.original.lastLoginAt), { dateStyle: "medium", timeStyle: "short" })
            : "—",
      },
      {
        id: "status",
        header: t("colStatus"),
        cell: ({ row }) => (
          <Badge tone={row.original.status === "ACTIVE" ? "success" : "danger"}>
            {t(`statuses.${row.original.status}`)}
          </Badge>
        ),
      },
    ],
    [t, tp, format],
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("staff") }]}
        description={t("description")}
      />
      <AdminDataTable
        caption={t("caption")}
        columns={columns}
        data={data.staff}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.name}
        minWidth="48rem"
        empty={null}
      />
      <AdminCard title={t("permissionsTitle")}>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {data.allPermissions.map((p) => (
            <div key={p} className="flex items-center justify-between gap-2 border-b border-border py-1.5">
              <dt>{tp(p)}</dt>
              <dd>
                <code dir="ltr" className="font-sans text-xs text-muted-foreground">
                  {p}
                </code>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{t("editNote")}</p>
      </AdminCard>
    </div>
  );
}
