import { CircleX, Hourglass, WifiOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "inline" | "page" | "offline" | "expired";

const ICONS: Record<Variant, LucideIcon> = { inline: CircleX, page: CircleX, offline: WifiOff, expired: Hourglass };

/**
 * ErrorState (tokens.md 11.1): says what happened and what to do next, never technical details.
 * `page` is used by error.tsx / not-found.tsx (h1); the others are sections (h2).
 */
export function ErrorState({
  variant = "inline",
  title,
  body,
  action,
  footer,
  className,
}: {
  variant?: Variant;
  title: ReactNode;
  body?: ReactNode;
  /** Usually a retry button. */
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[variant];
  const H = variant === "page" ? "h1" : "h2";
  return (
    <div
      role={variant === "page" ? undefined : "alert"}
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        variant === "page" ? "px-4 py-16 md:py-24" : "px-6 py-8",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-16 items-center justify-center rounded-full",
          variant === "offline" || variant === "expired" ? "bg-warning-subtle text-warning" : "bg-danger-subtle text-danger",
        )}
      >
        <Icon className="size-7" />
      </span>
      <H className={cn("font-bold", variant === "page" ? "text-3xl md:text-4xl" : "text-lg")}>{title}</H>
      {body ? <p className="max-w-md text-base text-muted-foreground">{body}</p> : null}
      {action ? <div className="flex flex-wrap justify-center gap-3 pt-2">{action}</div> : null}
      {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
