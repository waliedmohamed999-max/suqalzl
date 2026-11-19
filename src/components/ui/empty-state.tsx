import { Inbox, SearchX, SlidersHorizontal, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ICONS: Record<"default" | "search" | "filtered" | "first-use", LucideIcon> = {
  default: Inbox,
  search: SearchX,
  filtered: SlidersHorizontal,
  "first-use": Sparkles,
};

/**
 * EmptyState (tokens.md 11.1): title + one line + ONE primary action. An empty state without a
 * next step is not allowed, so `action` is required.
 */
export function EmptyState({
  variant = "default",
  title,
  body,
  action,
  headingLevel = 2,
  className,
}: {
  variant?: keyof typeof ICONS;
  title: ReactNode;
  body?: ReactNode;
  action: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Icon = ICONS[variant];
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-8 text-center", className)}>
      <span
        aria-hidden="true"
        className="inline-flex size-16 items-center justify-center rounded-full bg-muted text-foreground-secondary"
      >
        <Icon className="size-7" />
      </span>
      <H className="text-lg font-semibold">{title}</H>
      {body ? <p className="max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      <div className="pt-1">{action}</div>
    </div>
  );
}
