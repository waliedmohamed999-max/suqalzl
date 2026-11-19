import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    // UI shows Asia/Riyadh; server and DB stay UTC (SPEC §2 "الوقت").
    timeZone: "Asia/Riyadh",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
