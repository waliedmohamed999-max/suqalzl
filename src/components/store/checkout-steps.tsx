import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** CheckoutStepper (README 4.3 / 3-13): 3 steps in an <ol>, aria-current="step", check icon when done. */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = useTranslations("checkout.steps");
  const steps = [t("address"), t("payment"), t("done")];
  return (
    <ol aria-label={t("label")} className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} aria-current={active ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "num inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                done || active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" /> : n}
            </span>
            <span className={cn("truncate", active ? "font-bold" : "text-muted-foreground")}>
              {s}
              {done ? <span className="sr-only"> {t("completed")}</span> : null}
            </span>
            {i < steps.length - 1 ? <span aria-hidden="true" className="h-px flex-1 bg-border" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
