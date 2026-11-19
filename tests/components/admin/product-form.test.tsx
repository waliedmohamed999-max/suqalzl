import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  combinations,
  emptyProductForm,
  formFromDetail,
  regenerateVariants,
  toUpsertInput,
  type OptionState,
} from "@/components/admin/product-form-state";
import { ProductForm } from "@/components/admin/views/product-form";
import { adminProductDetailDTO, productUpsertInput } from "@/features/admin/schema";
import { sample } from "@/dev/zod-sample";
import { renderWithIntl } from "../render";

const CAT = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
const size: OptionState = {
  key: "o1",
  nameAr: "المقاس",
  nameEn: "Size",
  values: [
    { key: "s54", valueAr: "54", valueEn: "54" },
    { key: "s56", valueAr: "56", valueEn: "56" },
  ],
};
const colour: OptionState = {
  key: "o2",
  nameAr: "اللون",
  nameEn: "Colour",
  values: [
    { key: "bk", valueAr: "أسود", valueEn: "Black" },
    { key: "br", valueAr: "بني", valueEn: "Brown" },
  ],
};

describe("product form state -> productUpsertInput", () => {
  it("generates the cartesian product of option values", () => {
    expect(combinations([size, colour])).toEqual([
      ["s54", "bk"],
      ["s54", "br"],
      ["s56", "bk"],
      ["s56", "br"],
    ]);
    expect(combinations([{ ...size, values: [] }])).toEqual([]);
  });

  it("keeps existing variants by combination and reports saved ones that disappear", () => {
    const first = regenerateVariants([size], emptyProductForm().variants).variants;
    const saved = first.map((v, i) => ({ ...v, id: `00000000-0000-4000-8000-00000000000${i}`, price: "1850.00" }));
    const { variants, archived } = regenerateVariants([{ ...size, values: [size.values[1]!] }], saved);
    expect(variants).toHaveLength(1);
    expect(variants[0]!.id).toBe(saved[1]!.id);
    expect(archived.map((v) => v.id)).toEqual([saved[0]!.id]);
  });

  it("builds a contract-valid input with integer halalas from riyal text (no floats)", () => {
    const f = emptyProductForm();
    f.nameAr = "بشت حساوي";
    f.nameEn = "Hasawi bisht";
    f.categoryId = CAT;
    f.options = [size, colour];
    f.variants = regenerateVariants(f.options, f.variants).variants.map((v, i) => ({
      ...v,
      sku: `bsh-${i}`,
      price: "1,850.5",
      compareAtPrice: i === 0 ? "2200" : "",
      stock: "٣",
    }));
    const { input, errors } = toUpsertInput(f, [
      { key: "i", status: "done", path: "products/abc/img-1.webp", url: "/m", alt: " " },
    ]);
    expect(errors).toEqual({});
    const parsed = productUpsertInput.parse(input);
    expect(parsed.variants[0]).toMatchObject({ sku: "BSH-0", price: 185050, compareAtPrice: 220000 });
    expect(parsed.images).toEqual([{ path: "products/abc/img-1.webp", alt: null }]);
  });

  it("reports client errors on the same paths the server uses", () => {
    const f = emptyProductForm();
    f.variants[0] = { ...f.variants[0]!, sku: "x", price: "abc", compareAtPrice: "1", stock: "1.5", isActive: false };
    const { errors } = toUpsertInput(f, [
      { key: "u", status: "uploading", previewUrl: "", progress: 10, alt: "", file: new File([], "a.png") },
    ]);
    expect(errors).toMatchObject({
      nameAr: "required",
      nameEn: "required",
      categoryId: "required",
      images: "uploading",
      "variants.0.sku": "sku",
      "variants.0.price": "price",
      "variants.0.stock": "integer",
      variants: "noActive",
    });
  });

  it("round-trips a saved product (Zod sample of the detail contract)", () => {
    const p = sample(adminProductDetailDTO, 9);
    const f = formFromDetail({
      ...p,
      options: [],
      variants: p.variants.slice(0, 1).map((v) => ({ ...v, optionValueKeys: [] })),
    });
    expect(f.variants).toHaveLength(1);
    expect(f.variants[0]!.id).toBe(p.variants[0]!.id);
  });
});

describe("ProductForm", () => {
  it("blocks saving with an error summary that links to the fields, and calls save when valid", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, data: { id: CAT, slug: "x", status: "DRAFT" } });
    renderWithIntl(<ProductForm product={null} categories={[{ id: CAT, label: "البشوت" }]} save={save} />);
    await userEvent.type(screen.getByLabelText(/الاسم \(عربي\)/), "بشت");
    const bar = screen.getByRole("region", { name: "حفظ التغييرات" });
    await userEvent.click(within(bar).getByRole("button", { name: /إنشاء المنتج/ }));
    expect(save).not.toHaveBeenCalled();
    const summary = screen.getByText(/ما حُفظ المنتج/).closest("[role=alert]")!;
    expect(within(summary as HTMLElement).getByRole("link", { name: /الاسم \(إنجليزي\)/ })).toHaveAttribute(
      "href",
      "#pf-nameEn",
    );

    await userEvent.type(screen.getByLabelText(/الاسم \(إنجليزي\)/), "Bisht");
    await userEvent.selectOptions(screen.getByLabelText(/التصنيف/, { selector: "select" }), CAT);
    await userEvent.type(screen.getByLabelText("SKU الصنف الوحيد"), "bsh-1");
    await userEvent.type(screen.getByLabelText("السعر الصنف الوحيد"), "950");
    await userEvent.click(within(bar).getByRole("button", { name: /إنشاء المنتج/ }));
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(productUpsertInput.parse(save.mock.calls[0]![0]).variants[0]).toMatchObject({ sku: "BSH-1", price: 95000 });
  });
});
