import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AccountNav } from "@/components/account/account-nav";
import { requireArea } from "@/lib/auth/guard";

// Session-dependent: never prerender (a build-time render would bake the login redirect in).
export const dynamic = "force-dynamic";

/**
 * Customer account shell (P0-18 Account-desktop / acc_tabs): inside the store chrome, a 260px side
 * nav on desktop, pills on mobile. The session is validated in the
 * database on every request (requireArea).
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireArea("account", locale);
  const t = await getTranslations("accountArea");
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
      <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:w-65 lg:shrink-0">
        <p className="hidden text-lg font-bold lg:block">{t("title")}</p>
        <AccountNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
