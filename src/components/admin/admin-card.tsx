import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card (README 4.6 KeyValue / Card): a titled `<section>` used for side cards and panels. */
export function AdminCard({
  title,
  action,
  children,
  className,
  headingLevel = 2,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3.5 rounded-lg border border-border bg-card p-4 text-card-foreground md:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <H className="text-base font-bold">{title}</H>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface KeyValueRow {
  label: ReactNode;
  value: ReactNode;
}

/** KeyValue: `<dl>` with the label column sized to content. */
export function KeyValue({ rows, className }: { rows: KeyValueRow[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm", className)}>
      {rows.map((r, i) => (
        <div key={i} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
