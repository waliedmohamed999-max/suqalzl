import type { ReactNode } from "react";

/** Customer account shell — P1-02 / P2-04. Access is enforced by middleware + requireArea("account") (auth commit). */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <main id="main">{children}</main>;
}
