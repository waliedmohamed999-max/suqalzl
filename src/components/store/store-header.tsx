import { Heart, ShoppingBag, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NavCategoryDTO } from "@/features/shell/queries";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";

/**
 * Store header (boards Home-mobile / Home-desktop, lib.py header_m/header_d/cat_rail).
 * Server Component inside data-surface="inverse-strong"; the only island is the mobile menu.
 * No cookies here (keeps store pages static): the cart count arrives with the cart in P2.
 */
export function StoreHeader({
  categories,
  whatsappNumber,
}: {
  categories: NavCategoryDTO[] | null;
  whatsappNumber: string | null;
}) {
  const t = useTranslations("nav");
  const ts = useTranslations("store");
  const tc = useTranslations("common");
  const locale = useLocale();
  const searchAction = locale === "en" ? "/en/search" : "/search";

  return (
    <div data-surface="inverse-strong" className="relative z-[var(--z-header)]">
      <p className="hidden bg-inverse px-8 py-2 text-center text-sm text-foreground-secondary lg:block">{ts("topStrip")}</p>
      <header className="px-2 lg:px-8">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-1 lg:min-h-19 lg:gap-6">
          <MobileNav categories={categories} whatsappNumber={whatsappNumber} />
          <div className="flex flex-1 justify-center lg:flex-none lg:justify-start">
            <Logo />
          </div>
          <SearchBox action={searchAction} id="q-desktop" className="hidden max-w-xl flex-1 lg:block" />
          <nav aria-label={t("account")} className="flex items-center gap-1 lg:ms-auto">
            <Button asChild variant="ghost" size="icon" className="hidden lg:inline-flex">
              <Link href="/account/wishlist" aria-label={t("wishlist")}>
                <Heart aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href="/account" aria-label={t("account")}>
                <User aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href="/cart" aria-label={t("cart")}>
                <ShoppingBag aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
        <div className="px-2 pb-3 lg:hidden">
          <SearchBox action={searchAction} id="q-mobile" className="[&_label]:bg-inverse" />
        </div>
      </header>
      <nav aria-label={t("categories")} className="border-b border-border lg:px-8">
        <ul className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 pb-3 lg:gap-1 lg:px-0 lg:pb-0">
          <li className="shrink-0">
            <Link
              href="/souq"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold px-3.5 text-sm font-semibold text-gold lg:rounded-none lg:border-0 lg:font-bold"
            >
              <span aria-hidden="true" className="size-2 animate-live-pulse rounded-full bg-live" />
              {t("souq")}
              <Badge tone="live" variant="outline" size="sm" icon={false} className="hidden lg:inline-flex">
                {tc("live")}
              </Badge>
            </Link>
          </li>
          {(categories ?? []).map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/c/${c.slug}`}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-3.5 text-sm text-foreground lg:rounded-none lg:border-0 lg:border-b-2 lg:border-transparent lg:px-3 hover:lg:border-gold"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
