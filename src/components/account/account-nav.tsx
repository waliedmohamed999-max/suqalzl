"use client";

import { Heart, MapPin, ShoppingBag, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account/orders", key: "orders", icon: ShoppingBag },
  { href: "/account/wishlist", key: "wishlist", icon: Heart },
  { href: "/account/addresses", key: "addresses", icon: MapPin },
  { href: "/account/profile", key: "profile", icon: User },
] as const;

/**
 * Account navigation (acc_tabs / acc_desktop): scrollable pills under the header on mobile, a
 * 260px side list with `border-s-[3px]` + aria-current on desktop. Requests/returns join in
 * P4.5/P2 when their screens exist.
 */
export function AccountNav() {
  const t = useTranslations("accountArea.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap lg:flex lg:w-full lg:rounded-md lg:border-0 lg:border-s-[3px] lg:px-3",
                  active
                    ? "border-primary bg-primary text-primary-foreground lg:border-border-strong lg:bg-muted lg:font-bold lg:text-foreground"
                    : "border-input bg-card text-foreground lg:border-transparent lg:bg-transparent lg:font-normal lg:hover:bg-accent",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
