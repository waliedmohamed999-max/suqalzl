import type { ReactNode } from "react";

/** Login / OTP shell — P1-02. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main id="main">{children}</main>;
}
