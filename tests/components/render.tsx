import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

export const messages = { ar, en };

/** Render inside the real messages for a locale, with <html dir> set like the root layout. */
export function renderWithIntl(ui: ReactElement, locale: "ar" | "en" = "ar", options?: RenderOptions) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Riyadh">
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  });
}
