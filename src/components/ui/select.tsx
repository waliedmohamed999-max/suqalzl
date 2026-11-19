import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./input";

/**
 * Select (tokens.md 11.1): the native <select> styled like Input. Native on purpose: the OS picker
 * is the most usable control on mobile, works without JS (filter/sort forms submit as GET) and is
 * fully accessible. The chevron sits at the logical end and is decorative.
 */
export function Select({ className, dense, children, ...props }: ComponentProps<"select"> & { dense?: boolean }) {
  return (
    <span className={cn("relative block", className)}>
      <select
        data-slot="select"
        className={cn(inputClass, "cursor-pointer appearance-none pe-10", dense ? "h-10" : "h-11")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}
