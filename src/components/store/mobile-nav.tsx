"use client";

import {
  ChevronLeft,
  Heart,
  Inbox,
  MapPin,
  Menu,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  Undo2,
  Zap,
  Info,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { fetchSession } from "@/features/auth/client";
import type { NavCategoryDTO } from "@/features/shell/queries";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { waLink } from "./whatsapp-fab";

/**
 * MobileNav (README 4.3, boards Menu-mobile + Menu-states): side sheet from `start`, 336px.
 * Account block (guest / logged in), Souq AlZal with the live badge, categories, account links,
 * help, language switch, WhatsApp. Focus trap + Esc from Radix. The session is read when the menu
 * opens (the header stays static/ISR: no cookies on the server, implementation-review 2.2).
 */
export function MobileNav({
  categories,
  whatsappNumber,
}: {
  categories: NavCategoryDTO[] | null;
  whatsappNumber: string | null;
}) {
  const t = useTranslations("store.menu");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!open || loggedIn !== null) return;
    let alive = true;
    fetchSession().then((s) => {
      if (alive) setLoggedIn(!!s?.authenticated && s.area === "account");
    });
    return () => {
      alive = false;
    };
  }, [open, loggedIn]);

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={tn("menu")} className="lg:hidden">
          <Menu aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent
        side="start"
        title={tn("menu")}
        hideTitle
        closeLabel={tn("closeMenu")}
        headerStart={<Logo size="sm" />}
      >
        <div className="flex flex-col gap-5 p-4">
          {loggedIn ? (
            <div className="flex items-center gap-3 rounded-md bg-muted p-4">
              <span className="flex-1 text-base font-bold">{t("accountTitle")}</span>
              <Link href="/account" className="inline-flex min-h-11 items-center text-sm font-semibold text-link">
                {t("accountLink")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 rounded-md bg-muted p-4">
              <strong className="text-base">{t("guestTitle")}</strong>
              <span className="text-sm text-muted-foreground">{t("guestBody")}</span>
              <Button asChild full>
                <Link href="/login">{tn("login")}</Link>
              </Button>
            </div>
          )}

          <Link
            href="/souq"
            data-surface="inverse"
            className="flex min-h-14 items-center gap-3 rounded-md px-3.5 text-base font-bold"
          >
            <Zap aria-hidden="true" className="size-5 text-gold" />
            <span className="flex-1">{tn("souq")}</span>
            <Badge tone="live" variant="outline" size="sm">
              {tc("live")}
            </Badge>
            <ChevronLeft aria-hidden="true" data-directional="" className="size-4 text-gold" />
          </Link>

          <Section title={t("sectionCategories")}>
            {categories === null ? (
              <Callout
                tone="warning"
                title={t("categoriesErrorTitle")}
                action={
                  <Button variant="secondary" onClick={() => router.refresh()}>
                    <RefreshCw aria-hidden="true" />
                    {tc("retry")}
                  </Button>
                }
              >
                {t("categoriesErrorBody")}
              </Callout>
            ) : (
              categories.map((c) => <Item key={c.slug} href={`/c/${c.slug}`} label={c.name} />)
            )}
          </Section>

          {loggedIn ? (
            <Section title={t("sectionAccount")}>
              <Item href="/account/orders" label={t("orders")} icon={<ShoppingBag />} />
              <Item href="/account/requests" label={t("requests")} icon={<Inbox />} />
              <Item href="/account/wishlist" label={t("wishlist")} icon={<Heart />} />
              <Item href="/account/addresses" label={t("addresses")} icon={<MapPin />} />
            </Section>
          ) : null}

          <Section title={t("sectionHelp")}>
            <Item href="/pages/shipping" label={t("shipping")} icon={<Truck />} />
            <Item href="/pages/returns" label={t("returns")} icon={<Undo2 />} />
            <Item href="/pages/faq" label={t("faq")} icon={<Info />} />
            <Item href="/sell" label={t("sell")} icon={<Store />} />
          </Section>

          <div className="flex items-center justify-between gap-2 pt-2">
            <span className="text-sm text-muted-foreground">{tc("language")}</span>
            <div className="inline-flex overflow-hidden rounded-md border border-input">
              <LangLink target="ar" current={locale} pathname={pathname} label={tc("arabic")} />
              <LangLink target="en" current={locale} pathname={pathname} label={tc("english")} />
            </div>
          </div>
        </div>
        {whatsappNumber ? (
          <div className="sticky bottom-0 border-t border-border bg-background px-4 pt-3 pb-4">
            <Button asChild variant="secondary" full>
              <a href={waLink(whatsappNumber)} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                {t("whatsapp")}
              </a>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col">
      <h2 className="mb-1 text-xs font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Item({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-3 border-b border-muted px-1 text-base text-foreground [&_svg]:size-5 [&_svg]:text-foreground-secondary"
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span className="flex-1">{label}</span>
      <ChevronLeft aria-hidden="true" data-directional="" className="!size-4 !text-muted-foreground" />
    </Link>
  );
}

function LangLink({
  target,
  current,
  pathname,
  label,
}: {
  target: "ar" | "en";
  current: string;
  pathname: string;
  label: string;
}) {
  const active = target === current;
  return (
    <Link
      href={pathname}
      locale={target}
      lang={target}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center px-4 text-sm",
        active ? "bg-primary font-semibold text-primary-foreground" : "bg-card text-card-foreground",
      )}
    >
      {label}
    </Link>
  );
}
