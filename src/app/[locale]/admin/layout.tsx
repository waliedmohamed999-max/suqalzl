import type { ReactNode } from "react";
import { requireArea } from "@/lib/auth/guard";

// D29: Arabic only at launch. /en/admin is redirected by the middleware and never rendered.
export function generateStaticParams() {
  return [{ locale: "ar" }];
}
export const dynamicParams = false;

/** admin shell (sidebar on start, topbar, breadcrumbs) — P1-02. Arabic only at launch (D29). */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireArea("admin", locale); // DB-validated session + role (middleware only checks the cookie)
  return <div data-area="admin">{children}</div>;
}
