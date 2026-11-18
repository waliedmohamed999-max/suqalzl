import { Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { RIYAL_SIGN, RIYAL_SIGN_READY, formatSAR, formatSARParts, type MoneyLocale } from "@/lib/format/money";
import { cn } from "@/lib/utils";

const SIZES = { sm: "text-sm font-bold whitespace-nowrap", md: "price", lg: "price-lg" } as const;

/**
 * The currency unit for the UI. Comes from lib/format/money.ts only (the single place that knows
 * the sign, tokens.md 8.4.7): the new sign U+20C1 when its font ships (RIYAL_SIGN_READY), else
 * the text unit of formatSAR (ar "ر.س", en "SAR") inside the same markup.
 */
function currencyUnit(locale: MoneyLocale): { text: string; isSign: boolean } {
  if (RIYAL_SIGN_READY) return { text: RIYAL_SIGN, isSign: true };
  const full = formatSAR(0, { locale, display: "text" });
  const amount = formatSARParts(0, { locale }).amount;
  return { text: full.replace(amount, "").trim(), isSign: false };
}

/**
 * Bare amount + unit with the binding markup of tokens.md 8.4.4:
 *  ar: <bdi dir=rtl><bdi dir=ltr>1,250.00</bdi>&nbsp;<span role=img aria-label="ريال سعودي">⃁</span></bdi>
 *  en: <bdi dir=ltr><span …>⃁</span>&nbsp;<bdi dir=ltr>1,250.00</bdi></bdi>
 * The sign sits LEFT of the number in both languages, same size and colour, never mirrored.
 */
export function Money({
  halalas,
  compact,
  className,
}: {
  halalas: number;
  compact?: boolean;
  className?: string;
}) {
  const locale = useLocale() as MoneyLocale;
  const t = useTranslations("price");
  const { amount } = formatSARParts(halalas, { locale, compact });
  const unit = currencyUnit(locale);
  const sign = (
    <span className={cn(unit.isSign && "riyal")} role="img" aria-label={t("riyal")}>
      {unit.text}
    </span>
  );
  const num = <bdi dir="ltr">{amount}</bdi>;
  return (
    <bdi dir={locale === "ar" ? "rtl" : "ltr"} className={cn("whitespace-nowrap", className)}>
      {locale === "ar" ? (
        <>
          {num}
          {" "}
          {sign}
        </>
      ) : (
        <>
          {sign}
          {" "}
          {num}
        </>
      )}
    </bdi>
  );
}

export interface PriceProps {
  /** Integer halalas (D7). The UI never computes money: it formats what the server sent. */
  halalas: number;
  /** Price before discount; shown only when greater than `halalas`. */
  compareAt?: number | null;
  size?: keyof typeof SIZES;
  variant?: "default" | "range" | "locked" | "free" | "compact";
  className?: string;
}

/**
 * Price (tokens.md 11.2): Server Component, no JS. Variants: with-compare (via compareAt), range
 * ("من" + price), locked (lock icon + accent), free ("مجاني", no unit), compact (dashboards only).
 */
export function Price({ halalas, compareAt, size = "md", variant = "default", className }: PriceProps) {
  const t = useTranslations("price");
  if (variant === "free") return <span className={cn(SIZES[size], className)}>{t("free")}</span>;
  const showCompare = compareAt != null && compareAt > halalas;
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
        variant === "locked" && "text-gold-text",
        className,
      )}
    >
      {variant === "locked" ? (
        <Lock aria-label={t("locked")} role="img" className="size-4 self-center" />
      ) : null}
      {variant === "range" ? <span className={SIZES[size]}>{t("from")}</span> : null}
      <Money halalas={halalas} compact={variant === "compact"} className={cn(SIZES[size], showCompare && "text-danger")} />
      {showCompare ? (
        <s className="price-old">
          <span className="sr-only">{t("before")} </span>
          <Money halalas={compareAt} />
        </s>
      ) : null}
    </span>
  );
}

/**
 * DiscountBadge (tokens.md 11.2): "-22%" isolated LTR so the sign never flips, read as
 * "خصم 22 بالمئة". `percent` is computed by the server (integer).
 */
export function DiscountBadge({
  percent,
  variant = "solid",
  className,
}: {
  percent: number;
  variant?: "solid" | "subtle";
  className?: string;
}) {
  const t = useTranslations("price");
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm px-2 text-xs font-bold",
        variant === "solid" ? "bg-discount text-discount-foreground" : "bg-danger-subtle text-danger",
        className,
      )}
    >
      <span aria-hidden="true">
        <bdi dir="ltr">{`−${percent}%`}</bdi>
      </span>
      <span className="sr-only">{t("discount", { percent })}</span>
    </span>
  );
}
