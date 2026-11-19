import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Money } from "./price";

/**
 * Installments line (D32 / SPEC 6.2-7): shown to every visitor on the product page and the cart, as
 * marketing text. The wording never promises approval (the provider decides at checkout). The
 * per-instalment amount is shown only when the server sends it (it omits it above the provider cap,
 * D32); the UI never computes it. Fixed min-height so it never shifts the layout.
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
        "flex min-h-11 items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-foreground",
        className,
      )}
    >
      <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-foreground-secondary" />
      <span>
        {installment
          ? t.rich("withAmount", {
              count: installment.count,
              amount: () => (
                <strong>
                  <Money halalas={installment.amount} />
                </strong>
              ),
            })
          : t("generic")}{" "}
        <span className="text-muted-foreground">{t("approval")}</span>
      </span>
    </p>
  );
}
