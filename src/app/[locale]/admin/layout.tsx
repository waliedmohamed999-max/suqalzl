import type { ReactNode } from "react";
import { DashShell } from "@/components/dash/dash-shell";
import { visibleAdminNavKeys } from "@/components/dash/nav-items";
import { getAdminCapabilities } from "@/features/admin/queries";
import { requireArea } from "@/lib/auth/guard";

// Session-dependent: never prerender (a build-time render would bake the login redirect in).
export const dynamic = "force-dynamic";

// D29: Arabic only at launch. /en/admin is redirected by the middleware and never rendered.
export function generateStaticParams() {
  return [{ locale: "ar" }];
}
export const dynamicParams = false;

/** admin shell (sidebar on start, topbar, breadcrumbs) — P1-02. Arabic only at launch (D29). */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const principal = await requireArea("admin", locale); // DB-validated session + role (middleware only checks the cookie)
  const caps = await getAdminCapabilities(principal);
  return (
    <DashShell area="admin" navKeys={visibleAdminNavKeys(caps.sections)}>
      {children}
    </DashShell>
  );
}
