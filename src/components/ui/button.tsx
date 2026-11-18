import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Button (tokens.md 11.1). Sizes: md 44 (default), lg 52, icon 44, and dense/icon-dense 36 for
 * desktop dashboards only (lint forbids them under store routes). No `sm`.
 * Focus: the global :focus-visible outline (ring = gold-700, gold-500 inside inverse scopes).
 * Disabled keeps >= 4.5:1 (muted text on muted surface), never opacity.
 */
export const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors duration-120 ease-standard select-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground aria-disabled:pointer-events-none aria-disabled:border-transparent aria-disabled:bg-muted aria-disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        gold: "bg-gold text-gold-foreground hover:bg-gold-hover",
        secondary: "bg-secondary text-secondary-foreground hover:shadow-sm",
        outline: "border border-input bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        bargain: "border-[1.5px] border-gold bg-card text-gold-text hover:bg-gold-subtle",
        destructive: "bg-destructive text-destructive-foreground hover:shadow-sm",
        link: "min-h-11 text-link underline-offset-4 hover:underline",
      },
      size: {
        md: "h-11 px-5 text-base [&_svg]:size-5",
        lg: "h-13 px-6 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
        dense: "h-9 px-3 text-sm [&_svg]:size-4",
        "icon-dense": "size-9 [&_svg]:size-4",
      },
      full: { true: "w-full" },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, sets aria-busy and blocks clicks; the label stays in place so the width never jumps. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  full,
  asChild = false,
  loading = false,
  disabled,
  type,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...(asChild ? {} : { type: type ?? "button", disabled: disabled || loading })}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </span>
      ) : null}
      <Slottable>{loading ? <span className="inline-flex items-center gap-2 opacity-0">{children}</span> : children}</Slottable>
    </Comp>
  );
}
