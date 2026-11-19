import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  /** usually a <StatusBadge> */
  status: ReactNode;
  /** display name of the user; null = "the system" */
  actor: string | null;
  at: Date | string;
  note?: ReactNode;
}

/**
 * StatusTimeline (README 4.6): newest first, the current (first) step has a filled dot. The same
 * component serves the admin order detail and the customer order page (simplified text there).
 */
export function StatusTimeline({
  events,
  label,
  className,
}: {
  events: TimelineEvent[];
  /** accessible name of the list */
  label?: string;
  className?: string;
}) {
  const t = useTranslations("admin.kit");
  const format = useFormatter();
  return (
    <ol aria-label={label ?? t("timeline")} className={cn("flex flex-col", className)}>
      {events.map((e, i) => {
        const current = i === 0;
        const last = i === events.length - 1;
        const at = typeof e.at === "string" ? new Date(e.at) : e.at;
        return (
          <li key={e.id} className="flex gap-3" aria-current={current ? "step" : undefined}>
            <span aria-hidden="true" className="flex w-4 flex-none flex-col items-center">
              <span
                className={cn(
                  "mt-1.5 size-3.5 rounded-full border-2",
                  current ? "border-border-strong bg-foreground" : "border-input bg-card",
                )}
              />
              {last ? null : <span className="my-0.5 w-0.5 flex-1 bg-border" />}
            </span>
            <div className={cn("flex flex-1 flex-col gap-1", last ? "" : "pb-4")}>
              <div className="flex flex-wrap items-center gap-2">
                {e.status}
                <time dateTime={at.toISOString()} className="text-xs text-muted-foreground">
                  {format.dateTime(at, { dateStyle: "medium", timeStyle: "short" })}
                </time>
              </div>
              <span className="text-sm text-foreground-secondary">{e.actor ?? t("system")}</span>
              {e.note ? <span className="text-sm text-muted-foreground">{e.note}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
