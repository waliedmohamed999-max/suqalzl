import { getTranslations } from "next-intl/server";
import { OrderCard } from "@/components/account/order-card";
import { Pagination } from "@/components/store/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { listMyOrdersAction } from "@/features/orders/actions";
import { Link } from "@/i18n/navigation";

/** "طلباتي" list (AccountOrders-mobile / Account-desktop): shared by /account and /account/orders. */
export async function OrdersView({ locale, page, path }: { locale: string; page: number; path: string }) {
  const t = await getTranslations("accountArea.orders");
  const ts = await getTranslations("states");
  const res = await listMyOrdersAction({ locale: locale === "en" ? "en" : "ar", page });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold lg:text-[28px]">{t("title")}</h1>
      {!res.ok ? (
        <ErrorState title={ts("errorTitle")} body={ts("errorBody")} />
      ) : res.data.items.length ? (
        <>
          <ul role="list" className="grid gap-3 md:grid-cols-2 md:gap-4">
            {res.data.items.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
          <Pagination path={path} query={{}} page={res.data.page} pageSize={res.data.perPage} total={res.data.total} />
        </>
      ) : (
        <EmptyState
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/products">{t("shop")}</Link>
            </Button>
          }
          className="rounded-lg bg-card"
        />
      )}
    </div>
  );
}

export function pageParam(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{1,4}$/.test(s) && Number(s) > 0 ? Number(s) : 1;
}
