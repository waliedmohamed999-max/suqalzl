import { useLocale } from "next-intl";
import { StatusBadge } from "@/components/status/status-badge";
import type { CustomerOrderDetailDTO } from "@/features/orders/schema";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

type Event = CustomerOrderDetailDTO["subOrders"][number]["timeline"][number];

/**
 * StatusTimeline (README 4.6, customer wording): newest first, badge + time + public note; the
 * current (latest) status has a filled dot. Never shows who made the change (orders/schema).
 */
export function StatusTimeline({ events, label }: { events: Event[]; label: string }) {
  const locale = useLocale();
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ol aria-label={label} className="flex flex-col">
      {sorted.map((e, i) => (
        <li key={`${e.status}-${e.at}`} className="relative flex gap-3 pb-4 last:pb-0">
          <span aria-hidden="true" className="flex flex-col items-center">
            <span
              className={cn("mt-1.5 size-3 rounded-full border-2 border-primary", i === 0 ? "bg-primary" : "bg-card")}
            />
            {i < sorted.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
          </span>
          <span className="flex flex-col gap-1">
            <StatusBadge entity="subOrder" status={e.status} size="sm" className="self-start" />
            <time dateTime={e.at} className="text-xs text-muted-foreground">
              {formatDateTime(e.at, locale)}
            </time>
            {e.note ? <span className="text-sm">{e.note}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
