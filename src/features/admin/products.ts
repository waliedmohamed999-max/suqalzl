import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { NotFoundError, withCtx, type Tx } from "@/lib/db";
import { checkUpload, mediaUrl, objectKey, storageProvider, UploadRejectedError } from "@/lib/providers/storage";
import type { Principal } from "@/lib/permissions";
import { sanitizePlainText } from "@/lib/text";
import { CodedError } from "@/features/common/action";
import { guardSection } from "./queries";
import {
  adminProductDetailDTO,
  adminProductListDTO,
  adminProductListInput,
  productSavedDTO,
  productUpsertInput,
  uploadedImageDTO,
  type AdminProductDetailDTO,
  type AdminProductListDTO,
  type UploadedImageDTO,
} from "./schema";

/**
 * Admin products (M1-03): list, edit form, create/edit of PLATFORM products (vendorId = null, D6).
 * Vendor products are listed read-only (their review flow with ProductRevision is P3-01).
 * Every write is audited in the same transaction (audit_logs, SPEC §4).
 */
export class CatalogAdminError extends CodedError {}

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

// ------------------------------------------------------------------ list
const ROW_SELECT = {
  id: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  status: true,
  isFeatured: true,
  soldCount: true,
  updatedAt: true,
  vendorId: true,
  images: { orderBy: { sort: "asc" }, take: 1, select: { path: true } },
  category: { select: { id: true, nameAr: true } },
  vendor: { select: { id: true, storeNameAr: true } },
  variants: { select: { price: true, stock: true, reservedStock: true, isActive: true } },
} as const satisfies Prisma.ProductSelect;
type Row = Prisma.ProductGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(p: Row) {
  const active = p.variants.filter((v) => v.isActive);
  const prices = (active.length ? active : p.variants).map((v) => v.price);
  return {
    id: p.id,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    imageUrl: p.images[0] ? mediaUrl(p.images[0].path) : null,
    category: p.category,
    vendor: p.vendor ? { id: p.vendor.id, nameAr: p.vendor.storeNameAr } : null,
    status: p.status,
    isFeatured: p.isFeatured,
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    available: active.reduce((s, v) => s + (v.stock - v.reservedStock), 0),
    variantCount: p.variants.length,
    soldCount: p.soldCount,
    editable: p.vendorId === null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

const LIST_SORT: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  updated_desc: [{ updatedAt: "desc" }, { id: "asc" }],
  created_desc: [{ createdAt: "desc" }, { id: "asc" }],
  name_asc: [{ nameAr: "asc" }, { id: "asc" }],
  price_asc: [{ basePrice: "asc" }, { id: "asc" }],
  price_desc: [{ basePrice: "desc" }, { id: "asc" }],
};
/** stock_asc sorts in memory over at most this many rows (enough for the M1 catalogue) */
const STOCK_SORT_CAP = 2000;

export async function listAdminProducts(principal: Principal | null, raw: unknown = {}): Promise<AdminProductListDTO> {
  const { ctx } = guardSection(principal, "products");
  const q = adminProductListInput.parse(raw);
  return withCtx(ctx, async (tx) => {
    const where: Prisma.ProductWhereInput = {
      AND: [
        q.q
          ? {
              OR: [
                { nameAr: { contains: q.q, mode: "insensitive" } },
                { nameEn: { contains: q.q, mode: "insensitive" } },
                { slug: { contains: q.q.toLowerCase() } },
                { variants: { some: { sku: { contains: q.q.toUpperCase() } } } },
              ],
            }
          : {},
        q.status ? { status: q.status } : {},
        q.categoryId ? { categoryId: q.categoryId } : {},
        q.vendor === "platform" ? { vendorId: null } : q.vendor ? { vendorId: q.vendor } : {},
      ],
    };
    const total = await tx.product.count({ where });
    let rows: ReturnType<typeof toRow>[];
    if (q.sort === "stock_asc") {
      const all = (await tx.product.findMany({ where, take: STOCK_SORT_CAP, select: ROW_SELECT })).map(toRow);
      all.sort((a, b) => a.available - b.available || a.id.localeCompare(b.id));
      rows = all.slice((q.page - 1) * q.perPage, q.page * q.perPage);
    } else {
      rows = (
        await tx.product.findMany({
          where,
          orderBy: LIST_SORT[q.sort],
          skip: (q.page - 1) * q.perPage,
          take: q.perPage,
          select: ROW_SELECT,
        })
      ).map(toRow);
    }
    return adminProductListDTO.parse({
      items: rows,
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.ceil(total / q.perPage),
    });
  });
}

// ------------------------------------------------------------------ detail (edit form)
async function loadDetail(tx: Tx, id: string): Promise<AdminProductDetailDTO> {
  const p = await tx.product.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, storeNameAr: true } },
      images: { orderBy: { sort: "asc" } },
      options: { orderBy: { sort: "asc" }, include: { values: { orderBy: { sort: "asc" } } } },
      variants: { orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!p) throw new NotFoundError();
  const valueOrder = p.options.map((o) => new Set(o.values.map((v) => v.id)));
  return adminProductDetailDTO.parse({
    id: p.id,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    descriptionAr: p.descriptionAr,
    descriptionEn: p.descriptionEn,
    categoryId: p.categoryId,
    vendor: p.vendor ? { id: p.vendor.id, nameAr: p.vendor.storeNameAr } : null,
    status: p.status,
    rejectReason: p.rejectReason,
    isFeatured: p.isFeatured,
    weightGrams: p.weightGrams,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    options: p.options.map((o) => ({
      id: o.id,
      nameAr: o.nameAr,
      nameEn: o.nameEn,
      values: o.values.map((v) => ({ id: v.id, key: v.id, valueAr: v.valueAr, valueEn: v.valueEn })),
    })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      optionValueKeys: valueOrder
        .map((set) => v.optionValueIds.find((x) => set.has(x)))
        .filter((x): x is string => !!x),
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      reservedStock: v.reservedStock,
      weightGrams: v.weightGrams,
      isActive: v.isActive,
    })),
    images: p.images.map((i) => ({ path: i.path, url: mediaUrl(i.path), alt: i.alt })),
    editable: p.vendorId === null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    storePath: p.status === "PUBLISHED" ? `/p/${p.slug}` : null,
  });
}

export async function getAdminProduct(principal: Principal | null, id: string): Promise<AdminProductDetailDTO> {
  const { ctx } = guardSection(principal, "products");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError();
  return withCtx(ctx, (tx) => loadDetail(tx, id));
}

// ------------------------------------------------------------------ create / update
export function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
  return s.length >= 2 ? s : "product";
}

/** paragraphs kept, markup/control characters removed (rich text editor: P3) */
export function sanitizeDescription(input: string | null): string | null {
  if (!input) return null;
  const out = input
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) =>
      p
        .split("\n")
        .map((line) => sanitizePlainText(line, 2000))
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 10_000);
  return out || null;
}

async function uniqueSlug(tx: Tx, wanted: string | undefined, nameEn: string, selfId: string | null): Promise<string> {
  const taken = async (s: string) => {
    const p = await tx.product.findUnique({ where: { slug: s }, select: { id: true } });
    return !!p && p.id !== selfId;
  };
  if (wanted) {
    if (await taken(wanted)) throw new CatalogAdminError("SLUG_TAKEN");
    return wanted;
  }
  const base = slugify(nameEn);
  for (let i = 1; i < 50; i++) {
    const s = i === 1 ? base : `${base}-${i}`;
    if (!(await taken(s))) return s;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function summary(d: AdminProductDetailDTO) {
  return {
    slug: d.slug,
    nameAr: d.nameAr,
    nameEn: d.nameEn,
    categoryId: d.categoryId,
    status: d.status,
    isFeatured: d.isFeatured,
    variants: d.variants.map((v) => ({
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      isActive: v.isActive,
    })),
    options: d.options.map((o) => `${o.nameAr}: ${o.values.map((v) => v.valueAr).join("/")}`),
    images: d.images.length,
  };
}

/** Images uploaded through the upload route must exist in storage (checked OUTSIDE the transaction). */
async function assertImagesExist(paths: string[]) {
  const uploaded = paths.filter((p) => p.startsWith("products/"));
  const storage = storageProvider();
  for (const key of uploaded) {
    const head = await storage.headObject({ bucket: "public", key }).catch(() => null);
    if (!head) throw new CatalogAdminError("INVALID_IMAGE");
  }
}

export async function saveProduct(
  principal: Principal | null,
  raw: unknown,
  opts: { id?: string; meta?: RequestMeta } = {},
): Promise<{ id: string; slug: string; status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED" | "ARCHIVED" }> {
  const { ctx } = guardSection(principal, "products");
  const input = productUpsertInput.parse(raw);
  const id = opts.id ?? null;
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError();
  await assertImagesExist(input.images.map((i) => i.path));

  return withCtx(
    ctx,
    async (tx) => {
      const before = id ? await loadDetail(tx, id) : null;
      if (before && !before.editable) throw new CatalogAdminError("VENDOR_PRODUCT_READ_ONLY");
      const cat = await tx.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
      if (!cat) throw new CatalogAdminError("CATEGORY_NOT_FOUND");

      // SKUs must be free (or already this product's)
      const ownVariantIds = new Set(before?.variants.map((v) => v.id) ?? []);
      for (const v of input.variants) if (v.id && !ownVariantIds.has(v.id)) throw new NotFoundError();
      // a row without id whose SKU is already one of this product's variants IS that variant
      const ownBySku = new Map(before?.variants.map((v) => [v.sku, v.id]) ?? []);
      for (const v of input.variants) if (!v.id && ownBySku.has(v.sku)) v.id = ownBySku.get(v.sku);
      if (
        new Set(input.variants.filter((v) => v.id).map((v) => v.id)).size !== input.variants.filter((v) => v.id).length
      )
        throw new CatalogAdminError("SKU_TAKEN");
      const clash = await tx.productVariant.findMany({
        where: { sku: { in: input.variants.map((v) => v.sku) }, ...(id ? { productId: { not: id } } : {}) },
        select: { sku: true },
      });
      if (clash.length) throw new CatalogAdminError("SKU_TAKEN");

      const slug = await uniqueSlug(tx, input.slug, input.nameEn, id);
      const active = input.variants.filter((v) => v.isActive).sort((a, b) => a.price - b.price);
      const cheapest = active[0]!;
      const now = new Date();
      const data = {
        nameAr: sanitizePlainText(input.nameAr, 120),
        nameEn: sanitizePlainText(input.nameEn, 120),
        slug,
        categoryId: input.categoryId,
        descriptionAr: sanitizeDescription(input.descriptionAr),
        descriptionEn: sanitizeDescription(input.descriptionEn),
        status: input.status,
        isFeatured: input.isFeatured,
        weightGrams: input.weightGrams,
        seoTitle: input.seoTitle ? sanitizePlainText(input.seoTitle, 70) || null : null,
        seoDescription: input.seoDescription ? sanitizePlainText(input.seoDescription, 170) || null : null,
        basePrice: cheapest.price,
        compareAtPrice:
          cheapest.compareAtPrice && cheapest.compareAtPrice > cheapest.price ? cheapest.compareAtPrice : null,
        publishedAt:
          input.status === "PUBLISHED"
            ? before?.publishedAt
              ? new Date(before.publishedAt)
              : now
            : before?.publishedAt
              ? new Date(before.publishedAt)
              : null,
      };
      if (!data.nameAr || !data.nameEn) throw new CatalogAdminError("VALIDATION");

      const product = id
        ? await tx.product.update({ where: { id }, data, select: { id: true } })
        : await tx.product.create({ data: { ...data, vendorId: null }, select: { id: true } });
      const productId = product.id;

      // options: replaced as a whole; variants are re-linked by key
      await tx.productOption.deleteMany({ where: { productId } });
      const keyToValueId = new Map<string, string>();
      for (const [i, o] of input.options.entries()) {
        const opt = await tx.productOption.create({
          data: {
            productId,
            nameAr: sanitizePlainText(o.nameAr, 40),
            nameEn: sanitizePlainText(o.nameEn, 40),
            sort: i,
          },
          select: { id: true },
        });
        for (const [j, v] of o.values.entries()) {
          const val = await tx.optionValue.create({
            data: {
              optionId: opt.id,
              valueAr: sanitizePlainText(v.valueAr, 40),
              valueEn: sanitizePlainText(v.valueEn, 40),
              sort: j,
            },
            select: { id: true },
          });
          keyToValueId.set(`${i}:${v.key}`, val.id);
        }
      }
      const seen = new Set<string>();
      for (const v of input.variants) {
        const vdata = {
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          stock: v.stock,
          weightGrams: v.weightGrams,
          isActive: v.isActive,
          optionValueIds: v.optionValueKeys.map((k, i) => keyToValueId.get(`${i}:${k}`)!),
        };
        if (v.id) {
          const cur = before!.variants.find((x) => x.id === v.id)!;
          if (v.stock < cur.reservedStock) throw new CatalogAdminError("VALIDATION");
          await tx.productVariant.update({ where: { id: v.id }, data: vdata });
          seen.add(v.id);
        } else {
          await tx.productVariant.create({ data: { ...vdata, productId } });
        }
      }
      // never delete a variant (carts/orders reference it): deactivate the ones left out
      const dropped = [...ownVariantIds].filter((x) => !seen.has(x));
      if (dropped.length)
        await tx.productVariant.updateMany({ where: { id: { in: dropped } }, data: { isActive: false } });

      await tx.productImage.deleteMany({ where: { productId } });
      if (input.images.length)
        await tx.productImage.createMany({
          data: input.images.map((img, i) => ({
            productId,
            path: img.path,
            alt: img.alt ? sanitizePlainText(img.alt, 120) || null : null,
            sort: i,
          })),
        });

      const after = await loadDetail(tx, productId);
      await audit(tx, ctx, {
        action: id ? "product.update" : "product.create",
        entity: "Product",
        entityId: productId,
        before: before ? summary(before) : undefined,
        after: summary(after),
        ip: opts.meta?.ip,
        userAgent: opts.meta?.userAgent,
      });
      return productSavedDTO.parse({ id: productId, slug: after.slug, status: after.status });
    },
    { timeout: 30_000 },
  );
}

// ------------------------------------------------------------------ image upload
const MAGIC: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/png",
    ext: "png",
    test: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x),
  },
  {
    type: "image/webp",
    ext: "webp",
    test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
  {
    type: "image/avif",
    ext: "avif",
    test: (b) =>
      String.fromCharCode(...b.slice(4, 8)) === "ftyp" && /^avi[fs]$/.test(String.fromCharCode(...b.slice(8, 12))),
  },
];
/** The declared type must match the file's real bytes (no SVG/HTML disguised as an image). */
export function sniffImage(bytes: Uint8Array, declared: string): { type: string; ext: string } {
  const m = MAGIC.find((x) => x.test(bytes));
  if (!m || m.type !== declared) throw new UploadRejectedError("TYPE");
  return m;
}

/**
 * Product image upload (multipart through our server: works with the local fallback too). Type and
 * size fixed by UPLOAD_POLICIES.productImage (SPEC §9); the key is generated by the server.
 */
export async function uploadProductImage(
  principal: Principal | null,
  file: { type: string; size: number; bytes: Uint8Array },
): Promise<UploadedImageDTO> {
  guardSection(principal, "products");
  checkUpload("productImage", file.type, file.size);
  if (file.bytes.byteLength !== file.size) throw new UploadRejectedError("SIZE");
  const { ext, type } = sniffImage(file.bytes, file.type);
  const month = new Date().toISOString().slice(0, 7);
  const key = objectKey(`products/${month}`, ext);
  try {
    await storageProvider().putObject({ bucket: "public", key, body: file.bytes, contentType: type });
  } catch (e) {
    console.error("[upload] storage put failed", e instanceof Error ? e.message : e);
    throw new CatalogAdminError("STORAGE_UNAVAILABLE");
  }
  return uploadedImageDTO.parse({ path: key, url: mediaUrl(key) });
}
