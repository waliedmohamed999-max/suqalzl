"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/store/price";
import { cn } from "@/lib/utils";

export interface SalesPoint {
  date: string;
  sales: number;
  orders: number;
}

/**
 * SalesChart (README 4.3, dataviz skill): one series -> no legend, the title names it. Daily
 * columns in chart-1 (validated vs the card surface), 4px rounded tops on a shared baseline, 2px
 * gaps, recessive axis. Each column is a focusable hit target with a tooltip (value first), and
 * the same numbers are in the table below (tooltips enhance, never gate). Columns follow the
 * reading direction, so the oldest day is on the right in Arabic.
 */
export function SalesChart({ points, title }: { points: SalesPoint[]; title: string }) {
  const t = useTranslations("admin.home");
  const format = useFormatter();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.sales));
  const day = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { day: "numeric", month: "short" });
  const tick = Math.max(1, Math.ceil(points.length / 6));

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="relative">
        <div role="list" aria-label={title} className="flex h-48 items-end gap-0.5 border-b border-border">
          {points.map((p, i) => {
            const h = p.sales === 0 ? 0 : Math.max(2, Math.round((p.sales / max) * 100));
            return (
              <div
                key={p.date}
                role="listitem"
                tabIndex={0}
                aria-label={t("chartPoint", { date: day(p.date), orders: p.orders })}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                className="group relative flex h-full min-w-0 flex-1 cursor-default items-end outline-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block w-full rounded-t-sm bg-chart-1 transition-opacity duration-120",
                    active != null && active !== i && "opacity-60",
                    "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
                  )}
                  style={{ height: `${h}%` }}
                />
                <span className="sr-only">
                  <Money halalas={p.sales} />
                </span>
                {active === i ? (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute start-1/2 bottom-full z-[var(--z-dropdown)] mb-2 flex -translate-x-1/2 flex-col gap-0.5 rounded-md border border-border bg-popover px-3 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-md rtl:translate-x-1/2"
                  >
                    <strong className="text-sm">
                      <Money halalas={p.sales} />
                    </strong>
                    <span className="text-muted-foreground">
                      {day(p.date)} · {t("ordersCount", { count: p.orders })}
                    </span>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" className="flex gap-0.5 pt-1 text-xs text-muted-foreground">
          {points.map((p, i) => (
            <span key={p.date} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
              {i % tick === 0 ? day(p.date) : ""}
            </span>
          ))}
        </div>
      </div>
      <details>
        <summary className="min-h-9 cursor-pointer text-sm font-semibold text-foreground-secondary">
          {t("chartTable")}
        </summary>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="py-1 text-start font-semibold">
                  {t("colDay")}
                </th>
                <th scope="col" className="py-1 text-end font-semibold">
                  {t("colSales")}
                </th>
                <th scope="col" className="py-1 text-end font-semibold">
                  {t("colOrders")}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-border">
                  <th scope="row" className="py-1 text-start font-normal">
                    {day(p.date)}
                  </th>
                  <td className="py-1 text-end">
                    <Money halalas={p.sales} />
                  </td>
                  <td className="py-1 text-end">{p.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
