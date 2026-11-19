"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdminCategoryDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { AdminCard, KeyValue } from "../admin-card";
import { PageHeader } from "../page-header";
import { DetailLayout } from "../states";
import { Thumb } from "../thumb";
import { Tree } from "../tree";

/** Default commission is a setting; categories carry an override in bps (null = default). */
const pct = (bps: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(bps / 100)}%`;

/**
 * /admin/categories (AdminCategories-desktop board), read only in M1: the two-level tree with
 * counts and flags, and the selected category's details beside it. Drag-to-reorder and editing
 * arrive with P3-01.
 */
export function CategoriesView({ tree }: { tree: AdminCategoryDTO[] }) {
  const t = useTranslations("admin.categories");
  const tn = useTranslations("admin.nav");
  const [selected, setSelected] = useState<AdminCategoryDTO | null>(tree[0] ?? null);
  const roots = tree.length;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("categories") }]}
        description={t("description", { count: roots })}
      />
      {tree.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            title={t("emptyTitle")}
            body={t("emptyBody")}
            action={
              <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
                {t("backHome")}
              </Link>
            }
          />
        </div>
      ) : (
        <DetailLayout
          main={
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <p className="border-b border-border bg-background px-3 py-2.5 text-sm text-muted-foreground">
                {t("treeHint")}
              </p>
              <Tree
                label={t("treeLabel")}
                nodes={tree}
                getId={(c) => c.id}
                getChildren={(c) => c.children}
                defaultExpanded={tree
                  .filter((c) => c.children.length)
                  .slice(0, 1)
                  .map((c) => c.id)}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
                renderItem={(c, level) => (
                  <>
                    <Thumb src={c.imageUrl} size={32} />
                    <span className={level === 1 ? "flex-1 text-sm font-bold" : "flex-1 text-sm"}>{c.nameAr}</span>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {t("count", { count: c.productCount })}
                    </span>
                    <Badge tone={c.isActive ? "success" : "neutral"} size="sm">
                      {c.isActive ? t("visible") : t("hidden")}
                    </Badge>
                    {c.showOnHome ? (
                      <Badge tone="accent" size="sm" icon={false} className="hidden sm:inline-flex">
                        {t("onHome")}
                      </Badge>
                    ) : null}
                  </>
                )}
              />
            </div>
          }
          side={
            selected ? (
              <AdminCard title={t("details", { name: selected.nameAr })}>
                <KeyValue
                  rows={[
                    { label: t("nameAr"), value: selected.nameAr },
                    { label: t("nameEn"), value: <bdi dir="ltr">{selected.nameEn}</bdi> },
                    { label: t("slug"), value: <bdi dir="ltr">{selected.slug}</bdi> },
                    {
                      label: t("products"),
                      value: t("productsValue", { total: selected.productCount, published: selected.publishedCount }),
                    },
                    {
                      label: t("commission"),
                      value:
                        selected.commissionRate == null ? (
                          t("commissionDefault")
                        ) : (
                          <bdi dir="ltr">{pct(selected.commissionRate)}</bdi>
                        ),
                    },
                    { label: t("vendors"), value: selected.vendorsAllowed ? t("vendorsAllowed") : t("platformOnly") },
                    { label: t("store"), value: selected.isActive ? t("visible") : t("hidden") },
                    { label: t("home"), value: selected.showOnHome ? t("onHome") : t("notOnHome") },
                  ]}
                />
                <Link
                  href={`/admin/products?category=${selected.id}`}
                  className={buttonVariants({ variant: "outline", size: "dense" })}
                >
                  {t("viewProducts")}
                </Link>
              </AdminCard>
            ) : null
          }
        />
      )}
    </div>
  );
}
