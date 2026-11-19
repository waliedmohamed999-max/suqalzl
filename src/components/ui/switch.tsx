import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Switch (tokens.md 11.1): a native checkbox with role="switch" so it also works inside GET forms
 * without JS. 44px row including the label; the track is 44×24 with the brown-500 control border.
 */
export function Switch({
  id,
  label,
  hint,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { id: string; label: ReactNode; hint?: ReactNode }) {
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3", className)}>
      <span className="flex flex-col gap-0.5 py-2">
        <label htmlFor={id} className="cursor-pointer text-base leading-snug">
          {label}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none rounded-full"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-neutral bg-card transition-colors duration-120 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:bg-muted"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute start-1 top-1 size-4 rounded-full bg-neutral transition-transform duration-120 peer-checked:bg-primary-foreground peer-checked:ltr:translate-x-5 peer-checked:rtl:-translate-x-5"
        />
      </span>
    </div>
  );
}
