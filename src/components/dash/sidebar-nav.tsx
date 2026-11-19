"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, VENDOR_NAV } from "./nav-items";

/**
 * SidebarNav links (tokens.md 11.4): active = bg-sidebar-accent + 3px gold border on `start`
 * (border-s, mirrors in LTR) + aria-current="page". Rendered inside data-surface="inverse".
 * Icons are imported here (client module), so the server shell only passes the area name.
 */
export function SidebarNav({ area }: { area: "admin" | "vendor" }) {
  const t = useTranslations(`${area}.nav`);
  const pathname = usePathname();
  const items = area === "admin" ? ADMIN_NAV : VENDOR_NAV;
  const root = `/${area}`;
  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-col gap-0.5">
        {items.map(({ key, href, icon: Icon }) => {
          const active = href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md border-s-[3px] px-3 text-sm",
                  active
                    ? "border-gold bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground hover:bg-card",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn("size-5 shrink-0", active ? "text-gold" : "text-muted-foreground")}
                />
                <span className="flex-1">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
