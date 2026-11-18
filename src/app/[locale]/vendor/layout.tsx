import type { ReactNode } from "react";

// D29: Arabic only at launch. /en/vendor is redirected by the middleware and never rendered.
export function generateStaticParams() {
  return [{ locale: "ar" }];
}
export const dynamicParams = false;

/** vendor shell (sidebar on start, topbar, breadcrumbs) — P1-02. Arabic only at launch (D29). */
export default function VendorLayout({ children }: { children: ReactNode }) {
  return <div data-area="vendor">{children}</div>;
}
