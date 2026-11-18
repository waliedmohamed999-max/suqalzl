import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheck, CircleDashed, CircleX, Clock, Info, Sparkles, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "accent" | "warning" | "success" | "danger" | "live";

/** One fixed icon per tone so meaning never relies on colour alone (tokens.md 2.4). */
export const TONE_ICON: Record<Exclude<Tone, "live">, LucideIcon> = {
  neutral: CircleDashed,
  info: Info,
  accent: Sparkles,
  warning: Clock,
  success: CircleCheck,
  danger: CircleX,
};

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm font-semibold [&_svg]:shrink-0",
  {
    variants: {
      tone: { neutral: "", info: "", accent: "", warning: "", success: "", danger: "", live: "" },
      variant: { subtle: "", solid: "", outline: "border bg-transparent" },
      size: { sm: "h-5 px-1.5 text-xs [&_svg]:size-3", md: "h-6 px-2 text-xs [&_svg]:size-3.5" },
    },
    compoundVariants: [
      { variant: "subtle", tone: "neutral", className: "bg-neutral-subtle text-neutral" },
      { variant: "subtle", tone: "info", className: "bg-info-subtle text-info" },
      { variant: "subtle", tone: "accent", className: "bg-gold-subtle text-gold-text" },
      { variant: "subtle", tone: "warning", className: "bg-warning-subtle text-warning" },
      { variant: "subtle", tone: "success", className: "bg-success-subtle text-success" },
      { variant: "subtle", tone: "danger", className: "bg-danger-subtle text-danger" },
      { variant: "subtle", tone: "live", className: "bg-danger-subtle text-danger" },
      { variant: "solid", tone: "neutral", className: "bg-neutral text-neutral-foreground" },
      { variant: "solid", tone: "info", className: "bg-info text-info-foreground" },
      { variant: "solid", tone: "accent", className: "bg-gold text-gold-foreground" },
      { variant: "solid", tone: "warning", className: "bg-warning text-warning-foreground" },
      { variant: "solid", tone: "success", className: "bg-success text-success-foreground" },
      { variant: "solid", tone: "danger", className: "bg-danger text-danger-foreground" },
      { variant: "solid", tone: "live", className: "bg-live text-danger-foreground" },
      { variant: "outline", tone: "neutral", className: "border-neutral text-neutral" },
      { variant: "outline", tone: "info", className: "border-info text-info" },
      { variant: "outline", tone: "accent", className: "border-gold text-gold-text" },
      { variant: "outline", tone: "warning", className: "border-warning text-warning" },
      { variant: "outline", tone: "success", className: "border-success text-success" },
      { variant: "outline", tone: "danger", className: "border-danger text-danger" },
      { variant: "outline", tone: "live", className: "border-live text-live" },
    ],
    defaultVariants: { tone: "neutral", variant: "subtle", size: "md" },
  },
);

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  /** Show the tone icon (default true; the `live` tone shows a pulsing dot instead). */
  icon?: boolean;
}

export function Badge({ className, tone, variant, size, icon = true, children, ...props }: BadgeProps) {
  const t = tone ?? "neutral";
  const Icon = t === "live" ? null : TONE_ICON[t];
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone, variant, size }), className)} {...props}>
      {t === "live" ? (
        <span aria-hidden="true" className="size-2 animate-live-pulse rounded-full bg-current" />
      ) : icon && Icon ? (
        <Icon aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}
