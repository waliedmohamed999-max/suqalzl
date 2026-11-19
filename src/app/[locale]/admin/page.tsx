import { getTranslations } from "next-intl/server";
import { adminPage, one, type SearchParams } from "@/components/admin/server";
import { AdminHomeView } from "@/components/admin/views/admin-home";
import { getAdminCapabilities, getAdminDashboard } from "@/features/admin/queries";
import { DASHBOARD_PERIODS } from "@/features/admin/schema";

const SECTION_HREF = {
  products: "/admin/products",
  categories: "/admin/categories",
  orders: "/admin/orders",
  customers: "/admin/customers",
  settings: "/admin/settings",
  staff: "/admin/staff",
  audit: "/admin/audit",
} as const;

/** /admin: KPIs for reports.view; any other staff sees shortcuts to the sections they may open. */
export default async function AdminHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const g = await adminPage(params, "dashboard");
  const sp = await searchParams;
  const t = await getTranslations("admin.nav");
  if (!g.allowed) {
    const caps = await getAdminCapabilities(g.principal);
    const links = (Object.keys(SECTION_HREF) as (keyof typeof SECTION_HREF)[])
      .filter((s) => caps.sections[s])
      .map((s) => ({ href: SECTION_HREF[s], label: t(s) }));
    return <AdminHomeView data={null} canSeeReports={false} links={links} />;
  }
  const raw = one(sp.period);
  const period = (DASHBOARD_PERIODS as readonly string[]).includes(raw ?? "") ? raw : "30d";
  const data = await getAdminDashboard(g.principal, { period });
  return <AdminHomeView data={data} canSeeReports links={[]} />;
}
