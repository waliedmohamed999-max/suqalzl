"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Row-selection checkbox for tables and cards: 20px box in a 36px target (44px on touch), with an
 * accessible name and a mixed state for the "select all" header.
 */
export function SelectBox({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c === true)}
      aria-label={label}
      className={cn(
        "group inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md pointer-coarse:size-11",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-5 items-center justify-center rounded-sm border-2 border-neutral bg-card text-primary-foreground group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=indeterminate]:border-primary group-data-[state=indeterminate]:bg-primary"
      >
        <CheckboxPrimitive.Indicator>
          {checked === "indeterminate" ? (
            <Minus className="size-3.5" strokeWidth={3} />
          ) : (
            <Check className="size-3.5" strokeWidth={3} />
          )}
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
}
