"use client";

import { Lock, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  /** Group label, e.g. "الكمية". */
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  /** Quantity fixed by a price lock / bargain: shows a lock and no buttons. */
  locked?: boolean;
  lockedLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Stepper (README 4.3, implementation-review 4.3-7): role=group, "−" then <output> then "+" in a
 * fixed DOM order (mirrors visually in RTL). Store only: no free typing. 44px targets.
 */
export function Stepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
  locked,
  lockedLabel,
  disabled,
  className,
}: StepperProps) {
  if (locked) {
    return (
      <div
        role="group"
        aria-label={label}
        className={cn("inline-flex h-11 items-center gap-2 rounded-md bg-muted px-3 text-base", className)}
      >
        <Lock aria-hidden="true" className="size-4" />
        <output aria-live="polite" className="num font-semibold">
          {value}
        </output>
        {lockedLabel ? <span className="sr-only">{lockedLabel}</span> : null}
      </div>
    );
  }
  const btn =
    "inline-flex size-11 items-center justify-center rounded-md text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex h-11 items-center rounded-md border border-input bg-card", className)}
    >
      <button
        type="button"
        className={btn}
        aria-label={decreaseLabel}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <output aria-live="polite" className="num min-w-8 text-center text-base font-semibold">
        {value}
      </output>
      <button
        type="button"
        className={btn}
        aria-label={increaseLabel}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
