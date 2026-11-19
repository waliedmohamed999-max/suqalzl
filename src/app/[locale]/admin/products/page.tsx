import { categoryOptions } from "@/components/admin/category-options";
import { adminPage, cleanInput, one, toPage, toPer, type SearchParams } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { ProductsListView } from "@/components/admin/views/products-list";
import { listAdminProducts } from "@/features/admin/products";
import { listAdminCategories } from "@/features/admin/queries";
import { adminProductListInput } from "@/features/admin/schema";

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const g = await adminPage(params, "products");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const sp = await searchParams;
  const input = cleanInput(adminProductListInput, {
    q: one(sp.q),
    status: one(sp.status),
    categoryId: one(sp.category),
    vendor: one(sp.vendor),
    sort: one(sp.sort),
    page: toPage(sp.page),
    perPage: toPer(sp.per),
  });
  const [list, tree] = await Promise.all([listAdminProducts(g.principal, input), listAdminCategories(g.principal)]);
  const filtered = !!(input.q || input.status || input.categoryId || input.vendor);
  return (
    <ProductsListView
      list={list}
      categories={categoryOptions(tree).map((c) => ({ value: c.id, label: c.label }))}
      filtered={filtered}
    />
  );
}
