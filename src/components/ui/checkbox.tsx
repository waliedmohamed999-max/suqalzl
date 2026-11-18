"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Checkbox (tokens.md 11.1): 20px box with the brown-500 control border (7.13:1), inside a 44px
 * tap area that includes the label.
 */
export function Checkbox({
  className,
  label,
  hint,
  id,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & { label: ReactNode; hint?: ReactNode; id: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span className="flex min-h-11 items-center">
        <CheckboxPrimitive.Root
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="peer inline-flex size-5 shrink-0 items-center justify-center rounded-sm border-2 border-neutral bg-card text-primary-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:bg-muted"
          {...props}
        >
          <CheckboxPrimitive.Indicator>
            <Check aria-hidden="true" className="size-4" strokeWidth={3} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
      </span>
      <span className="flex flex-col gap-0.5 py-2.5">
        <label htmlFor={id} className="cursor-pointer text-base leading-snug">
          {label}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}
