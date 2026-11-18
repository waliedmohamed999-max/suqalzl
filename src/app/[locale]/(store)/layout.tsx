import type { ReactNode } from "react";

/** Store shell (header, categories, footer) — built by frontend-engineer in P1-02. */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return <main id="main">{children}</main>;
}
