import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Markdown } from "@/components/store/markdown";
import { ProductPurchase } from "@/components/store/product-purchase";
import { productDetailDTO } from "@/features/catalog/schema";
import { sample } from "@/dev/zod-sample";
import { renderWithIntl } from "./render";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

const S = "00000000-0000-4000-8000-0000000000";
const opt = {
  id: `${S}a1`,
  name: "المقاس",
  values: [
    { id: `${S}v1`, value: "56" },
    { id: `${S}v2`, value: "58" },
  ],
};
const variants = [
  {
    id: `${S}01`,
    sku: "B-56",
    price: 185_000,
    compareAtPrice: 220_000,
    optionValueIds: [`${S}v1`],
    stockLevel: "IN_STOCK" as const,
    maxQty: 5,
  },
  {
    id: `${S}02`,
    sku: "B-58",
    price: 190_000,
    compareAtPrice: null,
    optionValueIds: [`${S}v2`],
    stockLevel: "OUT" as const,
    maxQty: 0,
  },
];

describe("ProductPurchase", () => {
  it("shows the selected variant's price and changes it without a request; sold-out values are marked", () => {
    const add = vi.fn();
    renderWithIntl(
      <ProductPurchase name="بشت" options={[opt]} variants={variants} defaultVariantId={`${S}01`} addToCart={add} />,
    );
    expect(screen.getAllByText("1,850.00").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("status").some((s) => s.textContent?.includes("متوفر"))).toBe(true);
    const r58 = screen.getByRole("radio", { name: /58/ });
    expect(r58).toHaveAccessibleDescription("غير متوفر مع اختياراتك الحالية");
    fireEvent.click(r58);
    expect(screen.getAllByText("1,900.00").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /غير متوفر/ })[0]).toBeDisabled();
    expect(add).not.toHaveBeenCalled();
  });

  it("the stepper never goes above maxQty from the server", () => {
    renderWithIntl(
      <ProductPurchase
        name="x"
        options={[opt]}
        variants={[{ ...variants[0]!, maxQty: 2 }]}
        defaultVariantId={`${S}01`}
        addToCart={vi.fn()}
      />,
    );
    const plus = screen.getByRole("button", { name: "زيادة الكمية" });
    fireEvent.click(plus);
    expect(plus).toBeDisabled();
  });

  it("renders a Zod-generated ProductDetailDTO without crashing (D30)", () => {
    const p = sample(productDetailDTO, 3);
    renderWithIntl(
      <ProductPurchase
        name={p.name}
        options={p.options}
        variants={p.variants}
        defaultVariantId={p.defaultVariantId}
        addToCart={vi.fn()}
      />,
      "en",
    );
    expect(screen.getAllByRole("group", { name: "Quantity" }).length).toBe(1);
  });
});

describe("Markdown", () => {
  it("drops unsafe link schemes and keeps internal links", () => {
    renderWithIntl(<Markdown source={"[سياسة](/pages/returns) و [x](javascript:alert(1))"} />);
    expect(screen.getByRole("link", { name: "سياسة" })).toHaveAttribute("href", "/pages/returns");
    expect(screen.queryByRole("link", { name: "x" })).toBeNull();
  });
});
