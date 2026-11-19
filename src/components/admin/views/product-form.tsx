"use client";

import { Eye } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { StatusBadge } from "@/components/status/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { AdminProductDetailDTO, ProductUpsertInput } from "@/features/admin/schema";
import type { ActionResult } from "@/features/common/schema";
import { Link, useRouter } from "@/i18n/navigation";
import { AdminCard, KeyValue } from "../admin-card";
import { Field, Textarea, fieldAria } from "../fields";
import { FormSection } from "../form-section";
import { ImageUploader, imageItemsFrom, type ImageItem } from "../image-uploader";
import { PageHeader } from "../page-header";
import {
  emptyProductForm,
  formFromDetail,
  toUpsertInput,
  type FieldErrors,
  type ProductFormState,
} from "../product-form-state";
import { SaveBar, useUnsavedGuard } from "../save-bar";
import { VariantMatrix } from "../variant-matrix";

export interface CategoryOption {
  id: string;
  label: string;
}

export type SaveProduct = (
  input: ProductUpsertInput,
) => Promise<ActionResult<{ id: string; slug: string; status: string }>>;

const FORM_ID = "product-form";
const SECTIONS = ["basics", "images", "variants", "seo"] as const;

/**
 * Product form (AdminProduct-desktop board, P0-18 batch 1 item 2): both languages, images,
 * options -> variants with price/compare-at/stock/SKU, SEO, status and visibility. Long form with a
 * sticky SaveBar, a leave-without-saving guard and an error summary that links to the fields.
 * `save` is the server action (create or update); the server re-validates everything.
 */
export function ProductForm({
  product,
  categories,
  save,
}: {
  product: AdminProductDetailDTO | null;
  categories: CategoryOption[];
  save: SaveProduct;
}) {
  const t = useTranslations("admin.productForm");
  const tn = useTranslations("admin.nav");
  const format = useFormatter();
  const router = useRouter();
  const initial = useMemo(() => (product ? formFromDetail(product) : emptyProductForm()), [product]);
  const initialImages = useMemo(() => (product ? imageItemsFrom(product.images) : []), [product]);
  const [form, setForm] = useState<ProductFormState>(initial);
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [baseline, setBaseline] = useState(() => snapshot(initial, initialImages));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);

  const readOnly = product != null && !product.editable;
  const dirty = !readOnly && snapshot(form, images) !== baseline;
  const { dialog } = useUnsavedGuard(dirty);
  const set = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const err = (path: string) => (errors[path] ? t(`errors.${errors[path]}` as never) : undefined);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const { input, errors: clientErrors } = toUpsertInput(form, images);
    setBanner(null);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setErrors({});
    startSaving(async () => {
      const res = await save(input);
      if (!res.ok) {
        if (res.code === "VALIDATION" && res.issues?.length) {
          setErrors(Object.fromEntries(res.issues.map((i) => [i.path.replace(/^data\./, ""), "server"])));
          requestAnimationFrame(() => summaryRef.current?.focus());
        } else if (res.code === "SLUG_TAKEN") {
          setErrors({ slug: "slugTaken" });
          requestAnimationFrame(() => summaryRef.current?.focus());
        } else {
          setBanner(res.code);
          toast.error(t(`saveErrors.${knownCode(res.code)}`));
        }
        return;
      }
      setBaseline(snapshot(form, images));
      const published = res.data.status === "PUBLISHED";
      toast.success(published ? t("savedPublished") : t("saved"), {
        action: published
          ? { label: t("viewInStore"), onClick: () => window.open(`/p/${res.data.slug}`, "_blank", "noopener") }
          : undefined,
        duration: 5000,
      });
      if (!product) router.replace(`/admin/products/${res.data.id}`);
      else router.refresh();
    });
  };

  const discard = () => {
    setForm(initial);
    setImages(initialImages);
    setErrors({});
    setBanner(null);
  };

  const errorList = Object.entries(errors);
  const title = product ? product.nameAr : t("newTitle");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: tn("root"), href: "/admin" },
          { label: tn("products"), href: "/admin/products" },
          { label: product ? t("editCrumb") : t("newCrumb") },
        ]}
        status={product ? <StatusBadge entity="product" status={product.status} /> : undefined}
        actions={
          product?.storePath ? (
            <a
              href={product.storePath}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ variant: "ghost", size: "dense" })}
            >
              <Eye aria-hidden="true" />
              {t("viewInStore")}
            </a>
          ) : undefined
        }
      />

      <nav
        aria-label={t("sectionsNav")}
        className="sticky top-0 z-[var(--z-sticky)] -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-background px-1"
      >
        {SECTIONS.map((s) => (
          <a
            key={s}
            href={`#pf-${s}`}
            className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm whitespace-nowrap text-muted-foreground hover:border-border-strong hover:text-foreground"
          >
            {t(`sections.${s}`)}
          </a>
        ))}
      </nav>

      {readOnly ? (
        <Callout tone="info" title={t("readOnlyTitle")}>
          {t("readOnlyBody")}
        </Callout>
      ) : null}
      {product?.rejectReason ? (
        <Callout tone="warning" title={t("rejectReason")}>
          {product.rejectReason}
        </Callout>
      ) : null}

      {errorList.length ? (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Callout tone="danger" title={t("errorSummary", { count: errorList.length })}>
            <ul className="flex flex-col gap-1">
              {errorList.map(([path, key]) => (
                <li key={path}>
                  <a href={`#${anchorFor(path)}`} className="underline">
                    {fieldName(path, t)}: {t(`errors.${key}` as never)}
                  </a>
                </li>
              ))}
            </ul>
          </Callout>
        </div>
      ) : null}
      {banner ? <Callout tone="danger" title={t(`saveErrors.${knownCode(banner)}`)} /> : null}

      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <fieldset disabled={readOnly || saving} className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-[999_1_40rem]">
            <FormSection id="pf-basics" title={t("sections.basics")} description={t("basicsHelp")}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field id="pf-nameAr" label={t("nameAr")} required error={err("nameAr")}>
                  <Input
                    dense
                    {...fieldAria("pf-nameAr", { error: err("nameAr"), required: true })}
                    value={form.nameAr}
                    maxLength={120}
                    onChange={(e) => set("nameAr", e.target.value)}
                  />
                </Field>
                <Field id="pf-nameEn" label={t("nameEn")} required error={err("nameEn")}>
                  <Input
                    dense
                    dir="ltr"
                    {...fieldAria("pf-nameEn", { error: err("nameEn"), required: true })}
                    value={form.nameEn}
                    maxLength={120}
                    onChange={(e) => set("nameEn", e.target.value)}
                  />
                </Field>
              </div>
              <Field id="pf-descriptionAr" label={t("descriptionAr")} hint={t("descriptionHint")}>
                <Textarea
                  {...fieldAria("pf-descriptionAr", { hint: true })}
                  rows={5}
                  maxLength={10_000}
                  value={form.descriptionAr}
                  onChange={(e) => set("descriptionAr", e.target.value)}
                />
              </Field>
              <Field id="pf-descriptionEn" label={t("descriptionEn")}>
                <Textarea
                  id="pf-descriptionEn"
                  dir="ltr"
                  rows={4}
                  maxLength={10_000}
                  value={form.descriptionEn}
                  onChange={(e) => set("descriptionEn", e.target.value)}
                />
              </Field>
            </FormSection>

            <FormSection id="pf-images" title={t("sections.images")} description={t("imagesHelp")}>
              <ImageUploader label={t("images")} items={images} setItems={setImages} />
              {err("images") ? (
                <p role="alert" className="text-sm text-danger">
                  {err("images")}
                </p>
              ) : null}
            </FormSection>

            <FormSection id="pf-variants" title={t("sections.variants")} description={t("variantsHelp")}>
              <VariantMatrix
                options={form.options}
                variants={form.variants}
                errors={errors}
                translateError={(k) => t(`errors.${k}` as never)}
                onChange={({ options, variants }) => setForm((f) => ({ ...f, options, variants }))}
              />
            </FormSection>

            <FormSection id="pf-seo" title={t("sections.seo")} description={t("seoHelp")}>
              <Field id="pf-slug" label={t("slug")} hint={t("slugHint")} error={err("slug")}>
                <Input
                  dense
                  dir="ltr"
                  {...fieldAria("pf-slug", { hint: true, error: err("slug") })}
                  value={form.slug}
                  maxLength={80}
                  placeholder="hasawi-bisht-gold"
                  onChange={(e) => set("slug", e.target.value.toLowerCase())}
                />
              </Field>
              <Field id="pf-seoTitle" label={t("seoTitle")} hint={t("counter", { n: form.seoTitle.length, max: 70 })}>
                <Input
                  dense
                  {...fieldAria("pf-seoTitle", { hint: true })}
                  value={form.seoTitle}
                  maxLength={70}
                  onChange={(e) => set("seoTitle", e.target.value)}
                />
              </Field>
              <Field
                id="pf-seoDescription"
                label={t("seoDescription")}
                hint={t("counter", { n: form.seoDescription.length, max: 170 })}
              >
                <Textarea
                  {...fieldAria("pf-seoDescription", { hint: true })}
                  rows={3}
                  maxLength={170}
                  value={form.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                />
              </Field>
              <div
                aria-label={t("seoPreview")}
                role="group"
                className="flex flex-col gap-0.5 rounded-md border border-border p-3"
              >
                <span dir="ltr" className="text-xs text-muted-foreground rtl:text-end">
                  suqalzl.com › p › {form.slug || "…"}
                </span>
                <span className="text-lg text-info">{form.seoTitle || form.nameAr || t("seoTitle")}</span>
                <span className="text-sm text-foreground-secondary">
                  {form.seoDescription || t("seoDescriptionEmpty")}
                </span>
              </div>
            </FormSection>
          </div>

          <aside className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4 lg:sticky lg:top-14 lg:max-w-[21.25rem] lg:pt-6">
            <AdminCard title={t("statusCard")}>
              <Field id="pf-status" label={t("status")} hint={t(`statusHint.${form.status}`)}>
                <Select
                  id="pf-status"
                  dense
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as ProductFormState["status"])}
                >
                  {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
                    <option key={s} value={s}>
                      {t(`statuses.${s}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Switch
                id="pf-featured"
                label={t("featured")}
                hint={t("featuredHint")}
                checked={form.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
              />
              {product ? (
                <KeyValue
                  rows={[
                    {
                      label: t("updatedAt"),
                      value: format.dateTime(new Date(product.updatedAt), { dateStyle: "medium", timeStyle: "short" }),
                    },
                    {
                      label: t("createdAt"),
                      value: format.dateTime(new Date(product.createdAt), { dateStyle: "medium" }),
                    },
                  ]}
                />
              ) : null}
            </AdminCard>
            <AdminCard title={t("organizeCard")}>
              <Field id="pf-vendor" label={t("vendor")}>
                <Input id="pf-vendor" dense readOnly value={product?.vendor?.nameAr ?? t("platformVendor")} />
              </Field>
              <Field id="pf-categoryId" label={t("category")} required error={err("categoryId")}>
                <Select
                  dense
                  {...fieldAria("pf-categoryId", { error: err("categoryId"), required: true })}
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">{t("chooseCategory")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="pf-weightGrams" label={t("weight")} hint={t("weightHint")} error={err("weightGrams")}>
                <Input
                  dense
                  numeric
                  inputMode="numeric"
                  {...fieldAria("pf-weightGrams", { hint: true, error: err("weightGrams") })}
                  value={form.weightGrams}
                  onChange={(e) => set("weightGrams", e.target.value)}
                />
              </Field>
            </AdminCard>
            {readOnly ? (
              <Link href="/admin/products" className={buttonVariants({ variant: "outline" })}>
                {t("backToList")}
              </Link>
            ) : null}
          </aside>
        </fieldset>
        {/* a submit button inside the form so Enter in a field saves, also when the SaveBar is hidden */}
        <Button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          {t("save")}
        </Button>
      </form>
      <SaveBar
        dirty={dirty}
        saving={saving}
        onDiscard={discard}
        formId={FORM_ID}
        saveLabel={product ? t("save") : t("create")}
      />
      {dialog}
    </div>
  );
}

function snapshot(f: ProductFormState, images: ImageItem[]) {
  return JSON.stringify([f, images.map((i) => (i.status === "done" ? [i.path, i.alt] : [i.key, i.status, i.alt]))]);
}

const KNOWN = [
  "FORBIDDEN",
  "NOT_FOUND",
  "SKU_TAKEN",
  "VENDOR_PRODUCT_READ_ONLY",
  "CATEGORY_NOT_FOUND",
  "INVALID_IMAGE",
  "RATE_LIMITED",
  "UNAUTHORIZED",
];
function knownCode(code: string) {
  return KNOWN.includes(code) ? code : "INTERNAL";
}

/** Error-summary link targets: top-level fields have inputs; nested paths go to their section. */
function anchorFor(path: string) {
  if (path.startsWith("variants") || path.startsWith("options")) return "pf-variants";
  if (path.startsWith("images")) return "pf-images";
  return `pf-${path.split(".")[0]}`;
}

function fieldName(path: string, t: ReturnType<typeof useTranslations<"admin.productForm">>) {
  const m = /^variants\.(\d+)\.(\w+)/.exec(path);
  if (m) return t("fieldVariant", { n: Number(m[1]) + 1, field: t(`fields.${m[2]}` as never) });
  const o = /^options\.(\d+)/.exec(path);
  if (o) return t("fieldOption", { n: Number(o[1]) + 1 });
  const top = path.split(".")[0]!;
  return t(`fields.${top}` as never);
}
