import type { ReactNode } from "react";

/** Login / OTP shell (P1-02): each page renders its own <main id="main"> and chrome (boards differ). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
