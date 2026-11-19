"use client";

import { ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useRouter } from "@/i18n/navigation";
import type { AddToCartAction } from "./action-types";
import { emitCartCount } from "./cart-events";

/**
 * "أضف إلى السلة" island. Disabled while the action runs (no double submit). Success: toast with
 * "عرض السلة" + header badge update from the server's itemCount. Errors: translated code only
 * (actionErrors.*), never server text. Confirmation pattern = toast until the design decides
 * (README 7-1).
 */
export function AddToCartButton({
  action,
  variantId,
  bundleId,
  qty = 1,
  label,
  accessibleName,
  disabled,
  size,
  className,
}: {
  action: AddToCartAction;
  variantId?: string;
  bundleId?: string;
  qty?: number;
  label?: string;
  accessibleName?: string;
  disabled?: boolean;
  size?: ButtonProps["size"];
  className?: string;
}) {
  const t = useTranslations("catalog.card");
  const te = useTranslations("actionErrors");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      let res;
      try {
        res = await action({ variantId, bundleId, qty, locale });
      } catch {
        toast.error(te("NETWORK"));
        return;
      }
      if (res.ok) {
        emitCartCount(res.data.itemCount);
        toast.success(t("added"), { action: { label: t("viewCart"), onClick: () => router.push("/cart") } });
      } else {
        toast.error(te.has(res.code) ? te(res.code) : te("INTERNAL"));
      }
    });

  return (
    <Button
      type="button"
      size={size}
      loading={pending}
      disabled={disabled}
      onClick={onClick}
      aria-label={accessibleName}
      className={className}
    >
      <ShoppingBag aria-hidden="true" />
      {label ?? t("addToCart")}
    </Button>
  );
}
