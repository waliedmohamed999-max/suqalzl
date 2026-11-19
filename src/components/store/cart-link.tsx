"use client";

import { ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CartDTO } from "@/features/cart/schema";
import type { ActionResult } from "@/features/common/schema";
import { Link } from "@/i18n/navigation";
import { CART_EVENT } from "./cart-events";

/**
 * Header cart button with the count badge (IconButton: 20px circle, 12px text). The header is
 * static, so the count is fetched after load through the cart Server Action and then follows the
 * same-tab cart events. The badge is decorative; the link name carries the count.
 */
export function CartLink({ getCart }: { getCart: (locale: "ar" | "en") => Promise<ActionResult<CartDTO>> }) {
  const t = useTranslations("nav");
  const locale = useLocale() as "ar" | "en";
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    getCart(locale)
      .then((r) => alive && r.ok && setCount(r.data.itemCount))
      .catch(() => {});
    const on = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(CART_EVENT, on);
    return () => {
      alive = false;
      window.removeEventListener(CART_EVENT, on);
    };
  }, [getCart, locale]);

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/cart" aria-label={count ? t("cartCount", { count }) : t("cart")}>
        <ShoppingBag aria-hidden="true" />
        {count ? (
          <span
            aria-hidden="true"
            className="num absolute end-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-foreground"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
