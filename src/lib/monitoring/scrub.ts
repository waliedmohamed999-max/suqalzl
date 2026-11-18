/**
 * PII scrubbing before anything reaches Sentry (SPEC §2 Monitoring, devops notes §8):
 * phones (Latin and Arabic digits), e-mails, Saudi IBANs, addresses, cookies, authorization headers.
 * Used by beforeSend / beforeBreadcrumb, and safe to reuse for structured logs.
 */
import { toLatinDigits } from "../format/digits";

const PHONE = /(?:\+|00)?9665\d{8}|\b05\d{8}\b/g;
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const IBAN = /\bSA\d{2}[\s]?(?:\d[\s]?){20}\b/gi;
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;

const SENSITIVE_KEYS =
  /^(authorization|cookie|set-cookie|x-api-key|password|passwordHash|token|tokenHash|secret|iban|phone|recipientPhone|email|address|addressSnapshot|street|district|buildingNo|postalCode|nationalAddressShort|lat|lng|recipientName|buyerVatNumber|vatNumber|code|otp|floorPrice|autoAcceptPrice)$/i;

export function scrubString(input: string): string {
  // Arabic-Indic digits map 1:1 to ASCII, so indices are stable; we return the scrubbed Latin form.
  return toLatinDigits(input)
    .replace(BEARER, "$1 [REDACTED]")
    .replace(IBAN, "[IBAN]")
    .replace(EMAIL, "[EMAIL]")
    .replace(PHONE, "[PHONE]");
}

export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[DEPTH]";
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE_KEYS.test(k) ? "[REDACTED]" : scrubValue(v, depth + 1);
    return out;
  }
  return value;
}

/** Minimal shape of a Sentry event we touch (kept SDK-agnostic for unit tests). */
export interface ScrubbableEvent {
  user?: unknown;
  request?: { headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown; url?: string };
  extra?: unknown;
  contexts?: unknown;
  breadcrumbs?: unknown;
  message?: string;
  exception?: { values?: { value?: string }[] };
  tags?: unknown;
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  delete event.user; // sendDefaultPii: false — and never attach users manually
  if (event.request) {
    delete event.request.cookies;
    event.request.headers = scrubValue(event.request.headers);
    event.request.data = scrubValue(event.request.data);
    event.request.query_string = scrubValue(event.request.query_string);
    if (event.request.url) event.request.url = scrubString(event.request.url);
  }
  event.extra = scrubValue(event.extra);
  event.contexts = scrubValue(event.contexts);
  event.tags = scrubValue(event.tags);
  event.breadcrumbs = scrubValue(event.breadcrumbs);
  if (event.message) event.message = scrubString(event.message);
  for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubString(ex.value);
  return event;
}
