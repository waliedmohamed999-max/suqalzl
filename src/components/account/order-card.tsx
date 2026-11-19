import { useLocale, useTranslations } from "next-intl";
import { Money } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import { StatusBadge } from "@/components/status/status-badge";
import type { CustomerOrderSummaryDTO } from "@/features/orders/schema";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/date";

/** Order card for "طلباتي" (AccountOrders-mobile order_card): number, status, date, thumbnails, total. */
export function OrderCard({ order }: { order: CustomerOrderSummaryDTO }) {
  const t = useTranslations("accountArea.orders");
  const locale = useLocale();
  return (
    <article className="relative flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4 hover:border-border-strong">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">
          <Link href={`/account/orders/${order.number}`} className="after:absolute after:inset-0 after:content-['']">
            <span className="sr-only">{t("order")} </span>
            <bdi dir="ltr">{order.number}</bdi>
          </Link>
        </h2>
        <StatusBadge entity="order" status={order.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {formatDate(order.placedAt, locale)} · {t("itemCount", { count: order.itemCount })}
        {order.subOrderCount > 1 ? ` · ${t("shipments", { count: order.subOrderCount })}` : null}
      </p>
      {order.thumbnails.length ? (
        <ul className="flex gap-1.5" aria-hidden="true">
          {order.thumbnails.slice(0, 4).map((img, i) => (
            <li key={`${img.url}-${i}`} className="w-12">
              <ProductImage image={img} sizes="48px" className="rounded-sm" />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("total")}</span>
        <span className="text-base font-bold">
          <Money halalas={order.grandTotal} />
        </span>
      </p>
    </article>
  );
}
