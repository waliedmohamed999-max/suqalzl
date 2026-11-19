import { useTranslations } from "next-intl";
import type { StoreShellDTO } from "@/features/shell/queries";
import { Link } from "@/i18n/navigation";
import { Logo, Ornament } from "./logo";

const PAYMENTS = ["mada", "visa", "mastercard", "applePay", "stcPay", "tabby", "tamara"] as const;

/**
 * Store footer (boards footer_m / footer_d) inside data-surface="inverse". CR and VAT numbers come
 * from Setting.storeInfo and are shown only once filled (P8, D15): no placeholders in the UI.
 * Payment methods are text, not third-party logos (README 1).
 */
export function StoreFooter({ storeInfo, categories }: Pick<StoreShellDTO, "storeInfo" | "categories">) {
  const t = useTranslations("store.footer");
  const tp = useTranslations("store.payments");
  const tn = useTranslations("nav");

  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t("colShop"),
      links: (categories ?? []).slice(0, 5).map((c) => ({ href: `/c/${c.slug}`, label: c.name })),
    },
    {
      title: t("colSouq"),
      links: [
        { href: "/souq", label: tn("souq") },
        { href: "/souq/request/new", label: t("openRequest") },
        { href: "/pages/how-bargaining-works", label: t("howBargain") },
      ],
    },
    {
      title: t("colHelp"),
      links: [
        { href: "/pages/faq", label: t("faq") },
        { href: "/pages/shipping", label: t("shipping") },
        { href: "/pages/returns", label: t("returns") },
        { href: "/account/orders", label: t("track") },
      ],
    },
    {
      title: t("colAbout"),
      links: [
        { href: "/pages/about", label: t("about") },
        { href: "/sell", label: t("sell") },
        { href: "/pages/privacy", label: t("privacy") },
        { href: "/pages/terms", label: t("terms") },
      ],
    },
  ];

  const legal = [
    storeInfo.crNumber ? t("crNumber", { value: storeInfo.crNumber }) : null,
    storeInfo.vatNumber ? t("vatNumber", { value: storeInfo.vatNumber }) : null,
    t("vatIncluded"),
  ].filter(Boolean);

  return (
    <footer data-surface="inverse" className="mt-auto px-4 pt-8 pb-24 lg:px-8 lg:pt-12 lg:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="text-sm text-muted-foreground">{t("tagline")}</p>
            <Ornament />
          </div>
          {cols.map((c) =>
            c.links.length ? (
              <nav key={c.title} aria-label={c.title} className="flex flex-col">
                <h2 className="mb-2 text-sm font-bold text-gold">{c.title}</h2>
                <ul className="grid grid-cols-2 gap-x-4 lg:grid-cols-1">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="flex min-h-11 items-center text-sm text-foreground-secondary hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null,
          )}
        </div>
        <hr className="border-border" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("copyright", { name: storeInfo.name })} · {legal.join(" · ")}
          </p>
          <ul aria-label={t("paymentMethods")} className="flex flex-wrap gap-1.5">
            {PAYMENTS.map((p) => (
              <li
                key={p}
                dir="auto"
                className="rounded-sm border border-border px-2.5 py-1 text-xs text-foreground-secondary"
              >
                {tp(p)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
