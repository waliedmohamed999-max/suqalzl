import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * FormSection (README 4.6): title + description on `start` (up to 300px), fields in a white card
 * on `end`; stacks under lg. `id` makes it a target for section tabs and error-summary links.
 */
export function FormSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "flex scroll-mt-24 flex-wrap gap-x-8 gap-y-4 border-b border-border py-6 last:border-b-0",
        className,
      )}
    >
      <div className="flex max-w-[18.75rem] flex-[1_1_15rem] flex-col gap-1">
        <h2 id={headingId} className="text-lg font-bold">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex min-w-0 flex-[999_1_30rem] flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-5">
        {children}
      </div>
    </section>
  );
}
