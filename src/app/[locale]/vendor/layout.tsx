import type { ReactNode } from "react";
import { requireArea } from "@/lib/auth/guard";

// D29: Arabic only at launch. /en/vendor is redirected by the middleware and never rendered.
export function generateStaticParams() {
  return [{ locale: "ar" }];
}
export const dynamicParams = false;

/** vendor shell (sidebar on start, topbar, breadcrumbs) — P1-02. Arabic only at launch (D29). */
export default async function VendorLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireArea("vendor", locale); // DB-validated session + role (middleware only checks the cookie)
  return <div data-area="vendor">{children}</div>;
}
