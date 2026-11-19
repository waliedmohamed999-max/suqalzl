import { adminPage, cleanInput, one, toPage, toPer, type SearchParams } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { ORDER_PERIODS } from "@/components/admin/list-params";
import { OrdersListView } from "@/components/admin/views/orders-list";
import { listAdminOrders, periodBounds } from "@/features/admin/queries";
import { adminOrderListInput } from "@/features/admin/schema";

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const g = await adminPage(params, "orders");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const sp = await searchParams;
  const period = one(sp.period);
  const from = (ORDER_PERIODS as readonly string[]).includes(period ?? "")
    ? periodBounds(period as (typeof ORDER_PERIODS)[number]).from.toISOString()
    : undefined;
  const input = cleanInput(adminOrderListInput, {
    q: one(sp.q),
    status: one(sp.status),
    paymentStatus: one(sp.payment),
    from,
    page: toPage(sp.page),
    perPage: toPer(sp.per),
  });
  const list = await listAdminOrders(g.principal, input);
  return <OrdersListView list={list} filtered={!!(input.q || input.status || input.paymentStatus || input.from)} />;
}
