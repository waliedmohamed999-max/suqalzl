/**
 * Contact-sharing filter for negotiation notes and any free text between customers and stores
 * (SPEC 6.8 "منع التحايل", D21, D22, backend.md M8). Pure and shared by server and UI; the SERVER is
 * the judge (P1-00 §8-9). The original text is stored in noteRaw (admins only), the masked one in
 * noteSanitized, and every hit creates a ModerationFlag.
 *
 * Detects: phone numbers (Latin, Arabic-Indic ٠-٩ and Persian ۰-۹ digits, with separators),
 * e-mails (incl. "at/dot" obfuscation), URLs and bare domains, wa.me / t.me / chat links,
 * @handles, and social-app names (WhatsApp, Telegram, Snapchat, Instagram, TikTok, X, Signal).
 */
import { toLatinDigits } from "./format/digits";

export type ContactReason = "PHONE" | "EMAIL" | "URL" | "WHATSAPP" | "TELEGRAM" | "HANDLE" | "SOCIAL";

export interface ContactMatch {
  start: number;
  end: number;
  reason: ContactReason;
}

export interface ContactScan {
  hasContact: boolean;
  reasons: ContactReason[];
  matches: ContactMatch[];
}

const PATTERNS: { reason: ContactReason; re: RegExp }[] = [
  // wa.me / api.whatsapp.com / chat.whatsapp.com
  { reason: "WHATSAPP", re: /\b(?:wa\.me|(?:api|chat|web)\.whatsapp\.com)\/?\S*/giu },
  { reason: "TELEGRAM", re: /\b(?:t\.me|telegram\.me|telegram\.dog)\/?\S*/giu },
  // explicit URLs and www.
  { reason: "URL", re: /\b(?:https?:\/\/|www\.)\S+/giu },
  // e-mails, including "name at gmail dot com" / "name [at] gmail [dot] com"
  { reason: "EMAIL", re: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu },
  {
    reason: "EMAIL",
    re: /[\p{L}\p{N}._%+-]+\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\s+at\s+|\s+آت\s+)\s*[\p{L}\p{N}-]+\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+|\s+نقطة\s+|\s+دوت\s+)\s*(?:com|net|org|sa|me|io|co)\b/giu,
  },
  // bare domains: something.com, store.sa, ...
  {
    reason: "URL",
    re: /(?<![@\p{L}\p{N}.-])[a-z0-9][a-z0-9-]{1,62}\s?\.\s?(?:com|net|org|sa|me|io|ly|link|co|app|store|shop|online|site|info|biz|xyz|gl|gg)\b(?:\/\S*)?/giu,
  },
  // @handles (insta, snap, X...). Not e-mails: those are matched above and overlaps are merged.
  { reason: "HANDLE", re: /(?<![\p{L}\p{N}._%+-])@[\p{L}\p{N}_.]{2,}/giu },
  // phone numbers: >= 8 digits, separators allowed between digits (spaces, dashes, dots, brackets)
  { reason: "PHONE", re: /(?:\+|00)?\d(?:[\s\-.()_‏‎]{0,3}\d){7,}/gu },
  // app names in Arabic and English
  {
    reason: "SOCIAL",
    re: /(?:whats\s?app|watsapp|واتس(?:\s?اب)?|وتساب|واتساب|telegram|تيليجرام|تلجرام|تلقرام|تليجرام|snap\s?chat|\bsnap\b|سناب(?:\s?شات)?|\binsta(?:gram)?\b|انستا|انست(?:ا)?(?:جرام|قرام|غرام)|tik\s?tok|تيك\s?توك|\bsignal\b|سيجنال|تويتر|twitter)/giu,
  },
];

export function scanContact(text: string | null | undefined): ContactScan {
  if (!text) return { hasContact: false, reasons: [], matches: [] };
  // toLatinDigits maps every Arabic/Persian digit (one UTF-16 unit) to one ASCII digit, so
  // indices in `norm` are valid indices in `text`.
  const norm = toLatinDigits(text);
  const raw: ContactMatch[] = [];
  for (const { reason, re } of PATTERNS) {
    re.lastIndex = 0;
    for (const m of norm.matchAll(re)) {
      const start = m.index ?? 0;
      raw.push({ start, end: start + m[0].length, reason });
    }
  }
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: ContactMatch[] = [];
  for (const m of raw) {
    const last = merged[merged.length - 1];
    if (last && m.start < last.end) {
      if (m.end > last.end) last.end = m.end;
      continue;
    }
    merged.push({ ...m });
  }
  const reasons = [...new Set(raw.map((m) => m.reason))];
  return { hasContact: merged.length > 0, reasons, matches: merged };
}

export const CONTACT_MASK = "•••";

/** Replace every detected span with the mask. Returns the reasons for the ModerationFlag. */
export function sanitizeNote(
  text: string | null | undefined,
  mask = CONTACT_MASK,
): { sanitized: string; reasons: ContactReason[] } {
  if (!text) return { sanitized: text ?? "", reasons: [] };
  const { matches, reasons } = scanContact(text);
  if (!matches.length) return { sanitized: text, reasons: [] };
  let out = "";
  let pos = 0;
  for (const m of matches) {
    out += text.slice(pos, m.start) + mask;
    pos = m.end;
  }
  out += text.slice(pos);
  return { sanitized: out.replace(/\s{2,}/g, " ").trim(), reasons };
}
