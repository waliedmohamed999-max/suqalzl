import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./input";

/** Textarea (tokens.md 11.1): the Input look, 16px text, vertical resize only, min 3 rows. */
export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(inputClass, "min-h-24 resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}
