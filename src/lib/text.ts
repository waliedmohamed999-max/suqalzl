/**
 * Plain-text input hygiene on the SERVER (QA-B10, SPEC §9 "sanitize"). For short single-line fields
 * (person names, store names, labels): the UI escapes on output (React), but stored values also flow
 * into SMS/e-mail/PDF/CSV, so they are cleaned once on the way in.
 *
 * - Unicode NFC (Arabic text stays as typed; NFKC would rewrite presentation forms and digits).
 * - Control characters (C0/C1), zero-width/BOM and bidi overrides/isolates removed (RLO/LRO spoofing).
 *   ZWNJ/ZWJ (U+200C/U+200D) are kept: they are legitimate in Arabic/Persian names.
 * - HTML tags removed and remaining < > dropped: a name never needs markup.
 * - Leading CSV/spreadsheet formula characters (= + - @) dropped (CSV export in P3/P4).
 * - Whitespace collapsed and trimmed; cut to `max` CODE POINTS (never splits a surrogate pair).
 */
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
const INVISIBLE = /[​‎‏‪-‮⁠-⁤⁦-⁩﻿]/g;
const TAG = /<\/?[a-zA-Z!][^<>]*>/g;

export function sanitizePlainText(input: string, max: number): string {
  let s = input.normalize("NFC").replace(CONTROL, " ").replace(INVISIBLE, "");
  s = s.replace(TAG, " ").replace(/[<>]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[=+\-@]+/, "").trim();
  return Array.from(s).slice(0, max).join("").trim();
}

/** Person name as stored on User.name (customers, staff). */
export const NAME_MAX = 80;
export const sanitizeName = (raw: string | null | undefined) => sanitizePlainText(raw ?? "", NAME_MAX);
