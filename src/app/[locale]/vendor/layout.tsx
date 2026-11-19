import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashShell } from "@/components/dash/dash-shell";
import { requireArea } from "@/lib/auth/guard";
import { getVendorShell } from "@/features/shell/queries";

// Session-dependent: never prerender (a build-time render would bake the login redirect in).
export const dynamic = "force-dynamic";

// D29: Arabic only at launch. /en/vendor is redirected by the middleware and never rendered.
export function generateStaticParams() {
  return [{ locale: "ar" }];
}
export const dynamicParams = false;

/** vendor shell (sidebar on start, topbar, breadcrumbs) — P1-02. Arabic only at launch (D29). */
export default async function VendorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const principal = await requireArea("vendor", locale); // DB-validated session + role (middleware only checks the cookie)
  // D36-3: a store under review or rejected has no dashboard yet; its application page is /sell (P4-01).
  if (principal.kind === "vendor" && (principal.vendorStatus === "PENDING" || principal.vendorStatus === "REJECTED"))
    redirect("/sell");
  const vendor = await getVendorShell(principal);
  return (
    <DashShell area="vendor" vendor={vendor}>
      {children}
    </DashShell>
  );
}
