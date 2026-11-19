"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";

const HIDDEN_ON = ["/cart", "/checkout"];

/** wa.me wants digits only, with country code (E.164 without "+"). */
export function waLink(number: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

/**
 * WhatsAppFab (D24, tokens.md 11.2 v1.1): green `whatsapp` token (white icon 5.01:1), 56×56 circle,
 * shadow-md, NO motion, on `end` (left in Arabic), --z-fab. Hidden on /cart and /checkout and while
 * any sheet/dialog is open (Radix marks <body data-scroll-locked>). Pages with a StickyActionBar
 * raise it by setting `--fab-offset: 6rem` on an ancestor (tokens: bottom 96px).
 * A plain wa.me link: no SDK, no script.
 */
export function WhatsAppFab({ number }: { number: string }) {
  const t = useTranslations("store");
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <a
      href={waLink(number)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsappFab")}
      className="fixed end-4 bottom-[calc(var(--fab-offset,1.5rem)+env(safe-area-inset-bottom))] z-[var(--z-fab)] inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-md hover:bg-whatsapp-hover [body[data-scroll-locked]_&]:hidden"
    >
      <MessageCircle aria-hidden="true" className="size-7" />
    </a>
  );
}
