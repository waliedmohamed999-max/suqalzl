import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Money } from "./price";

/**
 * Installments line (D32 / SPEC 6.2-7): marketing text for EVERY visitor on the product page, the
 * bundle page and the cart — not an eligibility check. Rules:
 *  - the wording never promises approval: the lead is the D32 example ("قسّطها مع تابي أو تمارا")
 *    and the second sentence says it is subject to the provider's approval and limits (terms 5-2);
 *  - no fee / "interest-free" claim (R-02: that is the provider's to state);
 *  - the per-instalment amount appears only when the server sends it; the server omits it above
 *    the provider cap (D32). The UI never divides the price.
 * The checkout's Tabby/Tamara option is separate and follows the provider pre-check (6.2-13).
 * Fixed min-height so it never shifts the layout.
 */
export function BnplLine({
  installment,
  className,
}: {
  installment?: { count: number; amount: number } | null;
  className?: string;
}) {
  const t = useTranslations("catalog.bnpl");
  return (
    <p
      className={cn(
        "flex min-h-11 items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-sm text-foreground",
        className,
      )}
    >
      <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-foreground-secondary" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold">
          {installment
            ? t.rich("withAmount", {
                count: installment.count,
                amount: () => <Money halalas={installment.amount} />,
              })
            : t("generic")}
        </span>
        <span className="text-xs text-muted-foreground">{t("approval")}</span>
      </span>
    </p>
  );
}
