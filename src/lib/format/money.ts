/**
 * The ONLY place that knows the Saudi riyal sign (tokens.md 8.4.7, D25).
 * Never use Intl `style: "currency"` (CLDR 48 lists U+20C1 only as an alt symbol and ICU differs
 * between Node and browsers → hydration mismatch).
 *
 * Display modes:
 *  - symbol: the new sign U+20C1 (UI only, through <Price>, needs the "Souq Riyal Sign" font)
 *  - text:   "ر.س" (ar) / "SAR" (en) — SMS, WhatsApp, e-mail, push, <title>/meta/og (SPEC 6.1)
 *  - code:   "SAR" — CSV/Excel, payment gateways, feeds, ZATCA XML
 */
export const RIYAL_SIGN = "⃁"; // U+20C1 SAUDI RIYAL SIGN
/** Flip to true in the PR that adds src/app/fonts/souq-riyal-sign.woff2 (tokens.md 8.4.8). */
export const RIYAL_SIGN_READY = false;

export type MoneyLocale = "ar" | "en";
export type MoneyDisplay = "symbol" | "text" | "code";

const NBSP = " ";
const MINUS = "−";
const TEXT_UNIT: Record<MoneyLocale, string> = { ar: "ر.س", en: "SAR" };

function assertInt(halalas: number) {
  if (!Number.isSafeInteger(halalas)) throw new TypeError(`amount must be integer halalas, got ${halalas}`);
}

/** Latin digits, thousands "," and always 2 decimals (store rule, tokens.md 8.4.9). */
function formatExact(abs: number): string {
  const s = String(abs).padStart(3, "0");
  const riyals = s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${riyals}.${s.slice(-2)}`;
}

function formatCompact(abs: number, locale: MoneyLocale): string {
  // Display only (dashboard KPIs). Values are never computed from this string.
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return nf
    .format(abs / 100)
    .replace(/[\u00A0\u202F\u200F\u200E\u061C]/g, (c) => (c === "\u00A0" || c === "\u202F" ? " " : ""));
}

export interface SARParts {
  /** e.g. "1,250.00" or "−150.00" (U+2212), latin digits */
  amount: string;
  amountIsNegative: boolean;
}

export function formatSARParts(halalas: number, o: { locale: MoneyLocale; compact?: boolean }): SARParts {
  assertInt(halalas);
  const neg = halalas < 0;
  const abs = Math.abs(halalas);
  const body = o.compact ? formatCompact(abs, o.locale) : formatExact(abs);
  return { amount: neg ? `${MINUS}${body}` : body, amountIsNegative: neg };
}

/** While the sign font is missing, "symbol" degrades to "text" (same rule as <Price>). */
export function effectiveDisplay(display: MoneyDisplay): MoneyDisplay {
  return display === "symbol" && !RIYAL_SIGN_READY ? "text" : display;
}

/**
 * formatSAR(125000, { locale: "ar" })                 → "1,250.00 ر.س"
 * formatSAR(125000, { locale: "ar", display: "code" }) → "1,250.00 SAR"
 * formatSAR(125000, { locale: "en" })                 → "SAR 1,250.00"
 * symbol (when RIYAL_SIGN_READY): ar "1,250.00 ⃁", en "⃁ 1,250.00" (DOM order, tokens 8.4.4)
 * Default display = "text": safe for SMS/e-mail/meta. The UI renders <Price>, not this string.
 */
export function formatSAR(
  halalas: number,
  o: { locale: MoneyLocale; display?: MoneyDisplay; compact?: boolean },
): string {
  const { amount } = formatSARParts(halalas, o);
  const display = effectiveDisplay(o.display ?? "text");
  if (display === "symbol")
    return o.locale === "ar" ? `${amount}${NBSP}${RIYAL_SIGN}` : `${RIYAL_SIGN}${NBSP}${amount}`;
  const unit = display === "code" ? "SAR" : TEXT_UNIT[o.locale];
  return o.locale === "ar" ? `${amount} ${unit}` : `${unit} ${amount}`;
}

/** Plain decimal string for JSON-LD `price`, feeds and CSV: "1250.00" (tokens 8.4.6). */
export function toDecimalString(halalas: number): string {
  assertInt(halalas);
  const neg = halalas < 0;
  const s = String(Math.abs(halalas)).padStart(3, "0");
  return `${neg ? "-" : ""}${s.slice(0, -2)}.${s.slice(-2)}`;
}
