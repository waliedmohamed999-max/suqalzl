import { BarChart3, ChevronRight, Percent, ShoppingBag, Tag, UserPlus, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Money } from "@/components/store/price";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DASHBOARD_PERIODS, type AdminDashboardDTO } from "@/features/admin/schema";
import { Link } from "@/i18n/navigation";
import { divRoundHalfUp } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AdminCard } from "../admin-card";
import { PageHeader } from "../page-header";
import { SalesChart } from "../sales-chart";
import { StatCard } from "../stat-card";

type Period = (typeof DASHBOARD_PERIODS)[number];
const LOW_STOCK_SHOWN = 6;

/** Change vs the previous period in bps, integer math only; null when there is no base. */
export function deltaBps(value: number, previous: number): number | null {
  if (previous === 0) return null;
  return divRoundHalfUp((value - previous) * 10_000, previous);
}

/** /admin home (Admin-desktop board + P0-18 batch 1 item 3). */
export function AdminHomeView({
  data,
  canSeeReports,
  links,
}: {
  /** null when the person lacks reports.view (the KPI panels are hidden, not empty) */
  data: AdminDashboardDTO | null;
  canSeeReports: boolean;
  /** sections the person may open, for the shortcut list shown without reports.view */
  links: { href: string; label: string }[];
}) {
  const t = useTranslations("admin.home");
  const tn = useTranslations("admin.nav");

  return (
    <div className="flex flex-col gap-5 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("home") }]}
        actions={data ? <PeriodPicker current={data.period} /> : undefined}
      />

      {!canSeeReports || !data ? (
        <AdminCard title={t("noReportsTitle")}>
          <p className="text-sm text-muted-foreground">{t("noReportsBody")}</p>
          {links.length ? (
            <ul className="flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={buttonVariants({ variant: "outline", size: "dense" })}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </AdminCard>
      ) : (
        <Dashboard data={data} />
      )}
    </div>
  );
}

function PeriodPicker({ current }: { current: Period }) {
  const t = useTranslations("admin.home");
  return (
    <nav aria-label={t("period")} className="flex flex-wrap gap-1.5">
      {DASHBOARD_PERIODS.map((p) => (
        <Link
          key={p}
          href={p === "30d" ? "/admin" : `/admin?period=${p}`}
          aria-current={p === current ? "true" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center rounded-full border px-3 text-sm pointer-coarse:min-h-11",
            p === current
              ? "border-border-strong bg-foreground font-semibold text-background"
              : "border-input bg-card hover:bg-accent",
          )}
        >
          {t(`periods.${p}`)}
        </Link>
      ))}
    </nav>
  );
}

function Dashboard({ data }: { data: AdminDashboardDTO }) {
  const t = useTranslations("admin.home");
  const k = data.kpis;
  const noVendors =
    data.topVendors.every((v) => v.vendorId === null) &&
    data.vendorBalances.pending === 0 &&
    data.vendorBalances.available === 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label={t("kpi.sales")}
          icon={BarChart3}
          value={<Money halalas={k.sales.value} compact />}
          deltaBps={deltaBps(k.sales.value, k.sales.previous)}
        />
        <StatCard
          label={t("kpi.orders")}
          icon={ShoppingBag}
          value={k.orders.value.toLocaleString("en-US")}
          deltaBps={deltaBps(k.orders.value, k.orders.previous)}
        />
        <StatCard
          label={t("kpi.averageOrder")}
          icon={Tag}
          value={<Money halalas={k.averageOrder.value} />}
          deltaBps={deltaBps(k.averageOrder.value, k.averageOrder.previous)}
        />
        <StatCard
          label={t("kpi.newCustomers")}
          icon={UserPlus}
          value={k.newCustomers.value.toLocaleString("en-US")}
          deltaBps={deltaBps(k.newCustomers.value, k.newCustomers.previous)}
        />
        <StatCard
          label={t("kpi.commission")}
          icon={Percent}
          value={<Money halalas={k.platformCommission.value} compact />}
          deltaBps={deltaBps(k.platformCommission.value, k.platformCommission.previous)}
          note={t("kpi.commissionNote")}
        />
        <StatCard
          label={t("kpi.vendorBalances")}
          icon={Wallet}
          emphasis={!noVendors}
          value={
            noVendors ? (
              <span className="text-base font-normal text-muted-foreground">{t("noVendors")}</span>
            ) : (
              <span className="flex gap-4 text-xl">
                <span className="flex flex-col">
                  <span className="text-xs font-normal text-muted-foreground">{t("kpi.pending")}</span>
                  <Money halalas={data.vendorBalances.pending} compact />
                </span>
                <span className="flex flex-col">
                  <span className="text-xs font-normal text-muted-foreground">{t("kpi.available")}</span>
                  <Money halalas={data.vendorBalances.available} compact className="text-success" />
                </span>
              </span>
            )
          }
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AdminCard title={t("salesTitle")}>
          {data.salesChart.some((p) => p.sales > 0) ? (
            <SalesChart points={data.salesChart} title={t("salesTitle")} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noSales")}</p>
          )}
        </AdminCard>
        <AdminCard
          title={t("reviewTitle")}
          action={<MoreLink href="/admin/products?status=PENDING" label={t("reviewAll")} />}
        >
          {data.pendingReviewProducts > 0 ? (
            <p className="flex items-center gap-2 text-sm">
              <Badge tone="warning">{data.pendingReviewProducts.toLocaleString("en-US")}</Badge>
              {t("reviewCount", { count: data.pendingReviewProducts })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("reviewNone")}</p>
          )}
        </AdminCard>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <AdminCard
          title={t("lowStockTitle")}
          action={
            data.lowStock.length > LOW_STOCK_SHOWN ? (
              <MoreLink
                href="/admin/products?sort=stock_asc"
                label={t("lowStockAll", { count: data.lowStock.length })}
              />
            ) : undefined
          }
        >
          {data.lowStock.length ? (
            <ul className="flex flex-col">
              {data.lowStock.slice(0, LOW_STOCK_SHOWN).map((s) => (
                <li
                  key={s.variantId}
                  className="flex items-center justify-between gap-2 border-b border-border py-2.5 text-sm last:border-b-0"
                >
                  <Link href={`/admin/products/${s.productId}`} className="min-w-0 hover:underline">
                    <span className="block truncate">{s.productName}</span>
                    <bdi dir="ltr" className="text-xs text-muted-foreground">
                      {s.sku}
                    </bdi>
                  </Link>
                  <Badge tone={s.available <= 0 ? "danger" : "warning"}>
                    {s.available <= 0 ? t("soldOut") : t("left", { count: s.available })}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("lowStockNone")}</p>
          )}
        </AdminCard>
        <AdminCard title={t("topProducts")}>
          <RankTable
            caption={t("topProducts")}
            nameHeader={t("colProduct")}
            countHeader={t("colQty")}
            rows={data.topProducts.map((p) => ({
              key: p.productId ?? p.name,
              name: p.name,
              count: p.qty,
              sales: p.sales,
            }))}
            empty={t("noSales")}
          />
        </AdminCard>
        <AdminCard title={t("topVendors")}>
          {noVendors ? (
            <p className="text-sm text-muted-foreground">{t("noVendorsBody")}</p>
          ) : (
            <RankTable
              caption={t("topVendors")}
              nameHeader={t("colVendor")}
              countHeader={t("colOrders")}
              rows={data.topVendors.map((v) => ({
                key: v.vendorId ?? "platform",
                name: v.name,
                count: v.orders,
                sales: v.sales,
              }))}
              empty={t("noSales")}
            />
          )}
        </AdminCard>
      </div>
    </>
  );
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-gold-text hover:underline"
    >
      {label}
      <ChevronRight aria-hidden="true" data-directional="" className="size-4" />
    </Link>
  );
}

function RankTable({
  caption,
  nameHeader,
  countHeader,
  rows,
  empty,
}: {
  caption: string;
  nameHeader: string;
  countHeader: string;
  rows: { key: string; name: string; count: number; sales: number }[];
  empty: string;
}) {
  const t = useTranslations("admin.home");
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th scope="col" className="pb-1 text-start font-semibold">
            {nameHeader}
          </th>
          <th scope="col" className="pb-1 text-end font-semibold">
            {countHeader}
          </th>
          <th scope="col" className="pb-1 text-end font-semibold">
            {t("colSales")}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-border">
            <th scope="row" className="py-2 text-start font-normal">
              {r.name}
            </th>
            <td className="py-2 text-end">{r.count.toLocaleString("en-US")}</td>
            <td className="py-2 text-end whitespace-nowrap">
              <Money halalas={r.sales} compact />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
