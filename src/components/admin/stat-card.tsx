import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** "+12%" / "−3%" (U+2212) from basis points, latin digits, at most one decimal. */
export function formatDeltaBps(bps: number): string {
  const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Math.abs(bps) / 100);
  return `${bps > 0 ? "+" : bps < 0 ? "−" : ""}${pct}%`;
}

/**
 * StatCard (README 4.3): label + value (+ icon) + delta vs the previous period. The delta sits in
 * `<bdi dir="ltr">` with an arrow AND a word (never colour alone).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  deltaBps,
  note,
  emphasis,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  /** change vs the previous period in basis points (1200 = +12%); null/undefined hides it */
  deltaBps?: number | null;
  note?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  const t = useTranslations("admin.kit");
  const up = (deltaBps ?? 0) >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-md border bg-card p-4",
        emphasis ? "border-gold" : "border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon ? <Icon aria-hidden="true" className="size-5 text-gold-text" /> : null}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {deltaBps != null ? (
        <span
          className={cn("inline-flex items-center gap-1 text-sm font-semibold", up ? "text-success" : "text-danger")}
        >
          <Trend aria-hidden="true" className="size-4" />
          <bdi dir="ltr">{formatDeltaBps(deltaBps)}</bdi>
          <span className="font-normal text-muted-foreground">{t(up ? "deltaUp" : "deltaDown")}</span>
        </span>
      ) : null}
      {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
    </div>
  );
}
