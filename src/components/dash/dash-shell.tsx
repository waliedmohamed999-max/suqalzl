import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Logo } from "@/components/store/logo";
import { StatusBadge } from "@/components/status/status-badge";
import type { VendorShellDTO } from "@/features/shell/queries";
import { DashMobileMenu } from "./dash-mobile-menu";
import { LogoutButton } from "./logout-button";
import { SidebarNav } from "./sidebar-nav";

/**
 * Dashboard shell for /admin and /vendor (tokens.md 4 + 11.4, boards Admin-desktop / Vendor-desktop):
 * 240px sidebar on `start` (right in Arabic) inside data-surface="inverse" from `lg`; under `lg` a
 * 64px top bar with the menu as a side sheet. Content max 1440px, 24px gutter. Arabic only (D29).
 */
export function DashShell({
  area,
  vendor,
  children,
}: {
  area: "admin" | "vendor";
  vendor?: VendorShellDTO | null;
  children: ReactNode;
}) {
  const t = useTranslations(area);
  const head = (
    <div className="flex flex-col gap-3 px-2 pb-4">
      <Logo size="sm" />
      {area === "vendor" && vendor ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-border p-2.5">
          <span className="text-sm font-semibold text-foreground">{vendor.name}</span>
          <StatusBadge entity="vendor" status={vendor.status} size="sm" />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">{t(area === "vendor" ? "areaLabel" : "title")}</span>
      )}
    </div>
  );
  const nav = (
    <>
      <SidebarNav area={area} />
      <div className="mt-auto pt-4">
        <LogoutButton />
      </div>
    </>
  );
  return (
    <div className="flex min-h-dvh">
      <aside
        data-surface="inverse"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto px-3 py-5 lg:flex"
      >
        {head}
        {nav}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div data-surface="inverse" className="flex h-16 items-center gap-2 px-2 lg:hidden">
          <DashMobileMenu title={t("title")}>
            {head}
            {nav}
          </DashMobileMenu>
          <Logo size="sm" />
        </div>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-4 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Page title row (Topbar, tokens.md 11.4). Period filter, bell and search join with their data in P3/P4. */
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-4">
      <h1 className="flex-1 text-2xl font-bold">{title}</h1>
      {actions}
    </div>
  );
}
