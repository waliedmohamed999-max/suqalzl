import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TONE_ICON } from "./badge";

type CalloutTone = "info" | "success" | "warning" | "danger" | "secure";

const TONES: Record<CalloutTone, string> = {
  info: "bg-info-subtle [&_[data-icon]]:text-info",
  success: "bg-success-subtle [&_[data-icon]]:text-success",
  warning: "bg-warning-subtle [&_[data-icon]]:text-warning",
  danger: "bg-danger-subtle [&_[data-icon]]:text-danger",
  secure: "bg-gold-subtle [&_[data-icon]]:text-gold-text",
};

/**
 * Callout / InlineBanner (tokens.md 11.1): icon + title + body (+ action). danger = role alert,
 * the rest role status. Text stays `foreground` for contrast; the tone is on the surface and icon.
 */
export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: CalloutTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "secure" ? Lock : TONE_ICON[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md p-4 text-foreground", TONES[tone], className)}
    >
      <Icon data-icon="" aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="text-sm text-foreground-secondary">{children}</div> : null}
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
