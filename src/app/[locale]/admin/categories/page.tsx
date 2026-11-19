import { adminPage } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { CategoriesView } from "@/components/admin/views/categories";
import { listAdminCategories } from "@/features/admin/queries";

export default async function AdminCategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const g = await adminPage(params, "categories");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  return <CategoriesView tree={await listAdminCategories(g.principal)} />;
}
