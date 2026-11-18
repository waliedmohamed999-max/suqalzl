import { toLatinDigits } from "./format/digits";

/** SPEC 6.5: Saudi IBAN = "SA" + 22 digits, plus the ISO 13616 mod-97 check. */
export function normalizeIban(input: string): string {
  return toLatinDigits(input).replace(/[\s-]/g, "").toUpperCase();
}

export function isValidSaudiIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^SA\d{22}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const v = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of v) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** Display only: "SA****1234" (SPEC §4). */
export function maskIban(last4: string | null | undefined): string {
  return last4 ? `SA****${last4}` : "";
}
