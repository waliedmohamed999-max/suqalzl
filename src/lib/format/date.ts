/**
 * Dates for the UI (review 2.7): Gregorian calendar, latin digits, Asia/Riyadh (SPEC §2: stored
 * UTC, shown in Riyadh time). Use from Server Components (or pass the string to the client) so the
 * server and browser never format differently.
 */
const TZ = "Asia/Riyadh";
const tag = (locale: string) => (locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB-u-ca-gregory");

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
