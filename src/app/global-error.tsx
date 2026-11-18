"use client";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import "./globals.css";

/**
 * Last-resort 500 when the root layout itself fails: no i18n provider exists here, so the strings
 * are read straight from messages/*.json (Arabic first, English line under it).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-bold">{ar.states.errorTitle}</h1>
        <p className="text-muted-foreground">{ar.states.errorBody}</p>
        <p lang="en" dir="ltr" className="text-sm text-muted-foreground">
          {en.states.errorBody}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 cursor-pointer items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground"
        >
          {ar.common.retry}
        </button>
      </body>
    </html>
  );
}
