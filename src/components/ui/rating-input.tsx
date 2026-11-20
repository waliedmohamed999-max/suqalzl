"use client";

import { Star } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * RatingInput: 1–5 stars as five native radios in a <fieldset> (arrow keys move and select, the
 * screen reader reads "4 of 5"). Each star is a 44×44 target. Stars are not mirrored in RTL; the
 * first star is at the start of the line in both directions.
 */
export function RatingInput({
  legend,
  value,
  onChange,
  starLabel,
  invalid,
  describedBy,
  name,
}: {
  legend: ReactNode;
  value: number | null;
  onChange: (v: number) => void;
  /** accessible label per star, e.g. (n) => "4 من 5" */
  starLabel: (n: number) => string;
  invalid?: boolean;
  describedBy?: string;
  name?: string;
}) {
  const auto = useId();
  const group = name ?? `rating-${auto}`;
  return (
    <fieldset aria-invalid={invalid || undefined} aria-describedby={describedBy} className="flex flex-col gap-1">
      <legend className="pb-1 text-base font-semibold">{legend}</legend>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value != null && n <= value;
          return (
            <label
              key={n}
              className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
            >
              <input
                type="radio"
                name={group}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer absolute inset-0 m-0 cursor-pointer appearance-none"
                aria-label={starLabel(n)}
              />
              <Star
                aria-hidden="true"
                className={cn("size-7", on ? "fill-gold text-gold-text" : "text-neutral")}
                strokeWidth={1.75}
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
