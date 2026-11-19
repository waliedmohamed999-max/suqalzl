import { categoryOptions } from "@/components/admin/category-options";
import { adminPage, orNotFound } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { ProductForm } from "@/components/admin/views/product-form";
import { updateProductAction } from "@/features/admin/actions";
import { getAdminProduct } from "@/features/admin/products";
import { listAdminCategories } from "@/features/admin/queries";

export default async function EditProductPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const g = await adminPage(params, "products");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const { id } = await params;
  const [product, tree] = await Promise.all([
    orNotFound(() => getAdminProduct(g.principal, id)),
    listAdminCategories(g.principal),
  ]);
  return (
    <ProductForm
      key={product.updatedAt}
      product={product}
      categories={categoryOptions(tree)}
      save={updateProductAction.bind(null, product.id)}
    />
  );
}
