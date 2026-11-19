import { adminPage, orNotFound } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { CustomerDetailView } from "@/components/admin/views/customer-detail";
import { getAdminCustomer } from "@/features/admin/queries";

export default async function AdminCustomerPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const g = await adminPage(params, "customers");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const { id } = await params;
  const customer = await orNotFound(() => getAdminCustomer(g.principal, id));
  return <CustomerDetailView customer={customer} />;
}
