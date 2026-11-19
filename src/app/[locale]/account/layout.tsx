import type { ReactNode } from "react";
import { requireArea } from "@/lib/auth/guard";

// Session-dependent: never prerender (a build-time render would bake the login redirect in).
export const dynamic = "force-dynamic";

/** Customer account shell — P1-02 / P2-04. */
export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireArea("account", locale); // DB-validated session + role (middleware only checks the cookie)
  return <main id="main">{children}</main>;
}
