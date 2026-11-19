import { toLatinDigits } from "./format/digits";

/** D23: Saudi mobiles only, stored E.164 "+9665XXXXXXXX". */
export const SAUDI_MOBILE_E164 = /^\+9665[0-9]{8}$/;

/**
 * Accepts 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX, 009665XXXXXXXX, +9665XXXXXXXX, with spaces/dashes
 * and Arabic/Persian digits. Returns E.164 or null.
 */
export function normalizeSaudiMobile(input: string): string | null {
  const d = toLatinDigits(input).replace(/[\s\-().]/g, "");
  let m: RegExpExecArray | null;
  if ((m = /^(?:\+|00)?966(5\d{8})$/.exec(d))) return `+966${m[1]}`;
  if ((m = /^0?(5\d{8})$/.exec(d))) return `+966${m[1]}`;
  return null;
}

/** "+966551234567" → "055 123 4567" (tokens.md 8.5, show inside <bdi dir="ltr">). */
export function formatSaudiMobile(e164: string): string {
  if (!SAUDI_MOBILE_E164.test(e164)) return e164;
  const local = `0${e164.slice(4)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** For logs/PII-safe displays: "+9665******67". */
export function maskPhone(e164: string): string {
  return e164.length > 6 ? `${e164.slice(0, 5)}******${e164.slice(-2)}` : "***";
}
