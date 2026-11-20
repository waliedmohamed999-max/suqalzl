import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ChoiceCard (lib.py radio_row): a native radio or checkbox inside a bordered row, so arrow keys,
 * forms and screen readers behave natively. Checked = 2px `border-strong`; focus ring on the row.
 * `panel` renders under the row, OUTSIDE the <label> (it may hold interactive content such as the
 * Moyasar form), and only while checked.
 */
export function ChoiceCard({
  type = "radio",
  title,
  description,
  end,
  panel,
  className,
  checked,
  disabled,
  ...input
}: Omit<ComponentProps<"input">, "type" | "title"> & {
  type?: "radio" | "checkbox";
  title: ReactNode;
  description?: ReactNode;
  /** trailing content inside the row (a price, a stepper is NOT allowed here: use `panel`) */
  end?: ReactNode;
  panel?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md bg-card",
        checked ? "border-2 border-border-strong" : "border border-border",
        disabled && "bg-muted",
        className,
      )}
    >
      <label
        className={cn(
          "flex min-h-14 items-center gap-3 rounded-md px-3 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <input
          type={type}
          checked={checked}
          disabled={disabled}
          className="size-5 shrink-0 accent-primary"
          {...input}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("text-base font-semibold", disabled && "text-muted-foreground")}>{title}</span>
          {description ? <span className="text-sm text-muted-foreground">{description}</span> : null}
        </span>
        {end ? <span className="shrink-0">{end}</span> : null}
      </label>
      {checked && panel ? <div className="px-3 pb-3">{panel}</div> : null}
    </div>
  );
}
