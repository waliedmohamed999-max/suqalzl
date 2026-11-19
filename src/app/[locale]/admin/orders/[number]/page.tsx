import { adminPage, orNotFound } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { OrderDetailView } from "@/components/admin/views/order-detail";
import { getAdminOrder } from "@/features/admin/queries";

export default async function AdminOrderPage({ params }: { params: Promise<{ locale: string; number: string }> }) {
  const g = await adminPage(params, "orders");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const { number } = await params;
  const order = await orNotFound(() => getAdminOrder(g.principal, decodeURIComponent(number)));
  return <OrderDetailView order={order} />;
}
