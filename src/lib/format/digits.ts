/**
 * tokens.md 8.3: every numeric input accepts Arabic-Indic (٠-٩) and Persian (۰-۹) digits and the
 * Arabic decimal separator (٫) and converts them before validation. Shared by money parsing,
 * phone/IBAN/OTP inputs and lib/contact-filter.ts.
 */
const ARABIC_INDIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;

export function toLatinDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const c = ch.codePointAt(0)!;
    if (c >= ARABIC_INDIC_ZERO && c <= ARABIC_INDIC_ZERO + 9) out += String(c - ARABIC_INDIC_ZERO);
    else if (c >= PERSIAN_ZERO && c <= PERSIAN_ZERO + 9) out += String(c - PERSIAN_ZERO);
    else if (ch === "٫") out += "."; // ARABIC DECIMAL SEPARATOR
    else if (ch === "٬") out += ","; // ARABIC THOUSANDS SEPARATOR
    else out += ch;
  }
  return out;
}
