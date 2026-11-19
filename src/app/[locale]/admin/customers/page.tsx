import { adminPage, cleanInput, one, toPage, toPer, type SearchParams } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { CustomersListView } from "@/components/admin/views/customers";
import { listAdminCustomers } from "@/features/admin/queries";
import { adminCustomerListInput } from "@/features/admin/schema";

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const g = await adminPage(params, "customers");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const sp = await searchParams;
  const input = cleanInput(adminCustomerListInput, {
    q: one(sp.q),
    status: one(sp.status),
    sort: one(sp.sort),
    page: toPage(sp.page),
    perPage: toPer(sp.per),
  });
  const list = await listAdminCustomers(g.principal, input);
  return <CustomersListView list={list} filtered={!!(input.q || input.status)} />;
}
