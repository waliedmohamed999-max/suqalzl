import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Section title (lib.py sec_title): optional eyebrow, h2, optional "view all" link at the end. */
export function SectionHeading({
  id,
  title,
  eyebrow,
  link,
  className,
}: {
  id?: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  link?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        {eyebrow ? <p className="text-sm font-semibold text-gold-text">{eyebrow}</p> : null}
        <h2 id={id} className="text-xl font-bold lg:text-2xl">
          {title}
        </h2>
      </div>
      {link ? (
        <Link
          href={link.href}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-link hover:underline"
        >
          {link.label}
          <ChevronRight aria-hidden="true" data-directional="" className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
