import { defineRouting } from "next-intl/routing";

/**
 * SPEC §2 i18n: Arabic first (RTL) + English for the store.
 * D29: /admin and /vendor are Arabic-only at launch (middleware redirects /en/admin → /admin);
 * their strings still live in messages/*.json so English can be added later without code changes.
 * localePrefix "as-needed": Arabic URLs have no prefix (/p/slug), English uses /en/p/slug.
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

/** Sections that are Arabic-only at launch (D29). */
export const ARABIC_ONLY_SECTIONS = ["/admin", "/vendor"] as const;

export function dirOf(locale: AppLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
