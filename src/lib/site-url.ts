/**
 * Absolute URLs for canonical links, Open Graph and JSON-LD. Reads APP_URL directly (documented in
 * .env.example) so it can be used from any Server Component without the full env validation.
 * Arabic has no locale prefix, English is /en (routing.ts, localePrefix "as-needed").
 */
export function siteOrigin(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function localePath(path: string, locale: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === "ar") return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

export function absoluteUrl(path: string, locale: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteOrigin()}${localePath(path, locale)}`;
}
