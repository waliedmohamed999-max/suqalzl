import { categoryOptions } from "@/components/admin/category-options";
import { adminPage } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { ProductForm } from "@/components/admin/views/product-form";
import { createProductAction } from "@/features/admin/actions";
import { listAdminCategories } from "@/features/admin/queries";

export default async function NewProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const g = await adminPage(params, "products");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const tree = await listAdminCategories(g.principal);
  return <ProductForm product={null} categories={categoryOptions(tree)} save={createProductAction} />;
}
