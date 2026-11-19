/**
 * Product form state <-> contract (features/admin/schema.ts: adminProductDetailDTO in,
 * productUpsertInput out). Money is typed in RIYALS as text and converted with toHalalas() only
 * when building the input (D7: never a float).
 */
import type { AdminProductDetailDTO, ProductUpsertInput } from "@/features/admin/schema";
import { toDecimalString, toHalalas } from "@/lib/money";
import type { ImageItem } from "./image-uploader";

export interface OptionValueState {
  key: string;
  valueAr: string;
  valueEn: string;
}
export interface OptionState {
  key: string;
  nameAr: string;
  nameEn: string;
  values: OptionValueState[];
}
export interface VariantState {
  /** local row key (stable across regenerations) */
  key: string;
  id?: string;
  sku: string;
  optionValueKeys: string[];
  price: string;
  compareAtPrice: string;
  stock: string;
  reservedStock: number;
  isActive: boolean;
}
export interface ProductFormState {
  nameAr: string;
  nameEn: string;
  slug: string;
  categoryId: string;
  descriptionAr: string;
  descriptionEn: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  weightGrams: string;
  seoTitle: string;
  seoDescription: string;
  options: OptionState[];
  variants: VariantState[];
}

let n = 0;
export const localKey = (p = "k") => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

const money = (h: number | null) => (h == null ? "" : toDecimalString(h));

export function emptyProductForm(): ProductFormState {
  return {
    nameAr: "",
    nameEn: "",
    slug: "",
    categoryId: "",
    descriptionAr: "",
    descriptionEn: "",
    status: "DRAFT",
    isFeatured: false,
    weightGrams: "0",
    seoTitle: "",
    seoDescription: "",
    options: [],
    variants: [
      {
        key: localKey("v"),
        sku: "",
        optionValueKeys: [],
        price: "",
        compareAtPrice: "",
        stock: "0",
        reservedStock: 0,
        isActive: true,
      },
    ],
  };
}

export function formFromDetail(p: AdminProductDetailDTO): ProductFormState {
  const options: OptionState[] = p.options.map((o) => ({
    key: o.id,
    nameAr: o.nameAr,
    nameEn: o.nameEn,
    values: o.values.map((v) => ({ key: v.key, valueAr: v.valueAr, valueEn: v.valueEn })),
  }));
  const saved: VariantState[] = p.variants.map((v) => ({
    key: v.id,
    id: v.id,
    sku: v.sku,
    optionValueKeys: v.optionValueKeys,
    price: money(v.price),
    compareAtPrice: money(v.compareAtPrice),
    stock: String(v.stock),
    reservedStock: v.reservedStock,
    isActive: v.isActive,
  }));
  return {
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    slug: p.slug,
    categoryId: p.categoryId,
    descriptionAr: p.descriptionAr ?? "",
    descriptionEn: p.descriptionEn ?? "",
    // PENDING / REJECTED are vendor-review states; a platform product is edited as a draft then
    status: p.status === "PUBLISHED" || p.status === "ARCHIVED" ? p.status : "DRAFT",
    isFeatured: p.isFeatured,
    weightGrams: String(p.weightGrams),
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    options,
    // variants of removed option values (already archived) are not part of the form
    variants: regenerateVariants(options, saved).variants,
  };
}

/** Cartesian product of the option values (keys), in option order. */
export function combinations(options: OptionState[]): string[][] {
  const lists = options.filter((o) => o.values.length > 0).map((o) => o.values.map((v) => v.key));
  if (lists.length !== options.length) return [];
  return lists.reduce<string[][]>((acc, vals) => acc.flatMap((c) => vals.map((v) => [...c, v])), [[]]);
}

/**
 * Regenerate the variant rows after the options changed: existing rows are kept by combination,
 * new combinations get a new row (prefilled from the first row's price), and rows whose combination
 * disappeared are dropped from the form. Saved ones are then DEACTIVATED by the server (never
 * deleted: carts and orders reference them), so their order history stays.
 */
export function regenerateVariants(
  options: OptionState[],
  current: VariantState[],
): {
  variants: VariantState[];
  archived: VariantState[];
} {
  const combos = options.length === 0 ? [[]] : combinations(options);
  const byCombo = new Map(current.map((v) => [v.optionValueKeys.join("|"), v]));
  const template = current[0];
  const variants = combos.map(
    (combo) =>
      byCombo.get(combo.join("|")) ?? {
        key: localKey("v"),
        sku: "",
        optionValueKeys: combo,
        price: template?.price ?? "",
        compareAtPrice: template?.compareAtPrice ?? "",
        stock: "0",
        reservedStock: 0,
        isActive: true,
      },
  );
  // no-options product: keep the single row even if its keys were from removed options
  if (options.length === 0 && current.length && !byCombo.has("")) {
    const keep = current.find((v) => v.id) ?? current[0]!;
    variants[0] = { ...keep, optionValueKeys: [] };
  }
  const kept = new Set(variants.map((v) => v.key));
  return { variants, archived: current.filter((v) => !kept.has(v.key) && v.id) };
}

export type FieldErrors = Record<string, string>;

const tryHalalas = (s: string): number | null => {
  try {
    return toHalalas(s);
  } catch {
    return null;
  }
};
const intOf = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);

/**
 * Builds productUpsertInput. Returns client-side errors (message keys under admin.productForm.errors)
 * keyed by the same paths the server uses in ActionError.issues, so both render the same way.
 */
export function toUpsertInput(
  f: ProductFormState,
  images: ImageItem[],
): { input: ProductUpsertInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (f.nameAr.trim().length < 2) errors.nameAr = "required";
  if (f.nameEn.trim().length < 2) errors.nameEn = "required";
  if (!f.categoryId) errors.categoryId = "required";
  if (f.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) errors.slug = "slug";
  const weight = intOf(f.weightGrams);
  if (weight == null) errors.weightGrams = "integer";
  if (images.some((i) => i.status === "uploading")) errors.images = "uploading";
  else if (images.some((i) => i.status === "error")) errors.images = "failed";
  f.options.forEach((o, i) => {
    if (!o.nameAr.trim()) errors[`options.${i}.nameAr`] = "required";
    if (!o.nameEn.trim()) errors[`options.${i}.nameEn`] = "required";
    if (!o.values.length) errors[`options.${i}.values`] = "noValues";
    o.values.forEach((v, j) => {
      if (!v.valueAr.trim()) errors[`options.${i}.values.${j}.valueAr`] = "required";
      if (!v.valueEn.trim()) errors[`options.${i}.values.${j}.valueEn`] = "required";
    });
  });
  const skus = new Set<string>();
  const variants = f.variants.map((v, i) => {
    const price = tryHalalas(v.price);
    const cmp = v.compareAtPrice.trim() ? tryHalalas(v.compareAtPrice) : null;
    const stock = intOf(v.stock);
    const sku = v.sku.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(sku)) errors[`variants.${i}.sku`] = "sku";
    else if (skus.has(sku)) errors[`variants.${i}.sku`] = "skuDuplicate";
    skus.add(sku);
    if (price == null || price <= 0) errors[`variants.${i}.price`] = "price";
    if (v.compareAtPrice.trim() && (cmp == null || cmp <= 0)) errors[`variants.${i}.compareAtPrice`] = "price";
    else if (cmp != null && price != null && cmp <= price) errors[`variants.${i}.compareAtPrice`] = "compareAt";
    if (stock == null) errors[`variants.${i}.stock`] = "integer";
    return {
      ...(v.id ? { id: v.id } : {}),
      sku,
      optionValueKeys: v.optionValueKeys,
      price: price ?? 0,
      compareAtPrice: cmp,
      stock: stock ?? 0,
      weightGrams: null,
      isActive: v.isActive,
    };
  });
  if (!f.variants.length) errors.variants = "noVariants";
  else if (!f.variants.some((v) => v.isActive)) errors.variants = "noActive";

  const input: ProductUpsertInput = {
    nameAr: f.nameAr.trim(),
    nameEn: f.nameEn.trim(),
    ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
    categoryId: f.categoryId,
    descriptionAr: f.descriptionAr.trim() || null,
    descriptionEn: f.descriptionEn.trim() || null,
    status: f.status,
    isFeatured: f.isFeatured,
    weightGrams: weight ?? 0,
    seoTitle: f.seoTitle.trim() || null,
    seoDescription: f.seoDescription.trim() || null,
    options: f.options.map((o) => ({
      nameAr: o.nameAr.trim(),
      nameEn: o.nameEn.trim(),
      values: o.values.map((v) => ({ key: v.key, valueAr: v.valueAr.trim(), valueEn: v.valueEn.trim() })),
    })),
    variants,
    images: images.flatMap((i) => (i.status === "done" ? [{ path: i.path, alt: i.alt.trim() || null }] : [])),
  };
  return { input, errors };
}

/** Human label of a variant ("56 · أسود"). */
export function variantLabel(v: Pick<VariantState, "optionValueKeys">, options: OptionState[]): string {
  return v.optionValueKeys
    .map((k, i) => options[i]?.values.find((x) => x.key === k)?.valueAr ?? "")
    .filter(Boolean)
    .join(" · ");
}
