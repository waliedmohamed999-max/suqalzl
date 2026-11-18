"use client";

import { Toaster as Sonner, toast } from "sonner";

/**
 * Toast (tokens.md 11.1) via sonner: polite live region, top-centre so it never covers the sticky
 * action bar or the WhatsApp button, token colours, --z-toast. Errors use toast.error (rendered with
 * the danger tone + icon; text always says what happened).
 */
export function Toaster({ dir }: { dir: "rtl" | "ltr" }) {
  return (
    <Sonner
      dir={dir}
      position="top-center"
      style={{ zIndex: "var(--z-toast)" } as React.CSSProperties}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "!rounded-md !border !border-border !bg-card !text-card-foreground !shadow-md !font-sans !text-sm !gap-2",
          title: "!font-semibold",
          description: "!text-muted-foreground",
          success: "[&_[data-icon]]:!text-success",
          error: "!border-danger [&_[data-icon]]:!text-danger",
          info: "[&_[data-icon]]:!text-info",
          actionButton: "!bg-primary !text-primary-foreground !min-h-9 !rounded-md !font-semibold",
        },
      }}
    />
  );
}

export { toast };
