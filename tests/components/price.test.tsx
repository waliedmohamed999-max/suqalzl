import { describe, expect, it } from "vitest";
import { DiscountBadge, Price } from "@/components/store/price";
import { RIYAL_SIGN, RIYAL_SIGN_READY, formatSAR } from "@/lib/format/money";
import { renderWithIntl } from "./render";

const unit = (locale: "ar" | "en") =>
  RIYAL_SIGN_READY ? RIYAL_SIGN : formatSAR(0, { locale, display: "text" }).replace("0.00", "").trim();

describe("Price (tokens.md 8.4.4 markup)", () => {
  it("ar: number in LTR bdi, then NBSP, then the unit as role=img 'ريال سعودي' — sign left of the number visually", () => {
    const { container, getByRole } = renderWithIntl(<Price halalas={125000} />, "ar");
    const outer = container.querySelector("bdi[dir='rtl']")!;
    expect(outer).toBeTruthy();
    expect(outer.textContent).toBe(`1,250.00 ${unit("ar")}`);
    expect(outer.firstElementChild?.tagName).toBe("BDI");
    expect(outer.firstElementChild?.getAttribute("dir")).toBe("ltr");
    expect(getByRole("img", { name: "ريال سعودي" })).toHaveTextContent(unit("ar"));
  });

  it("en: unit first, then NBSP, then the number", () => {
    const { container, getByRole } = renderWithIntl(<Price halalas={125000} />, "en");
    const outer = container.querySelector("bdi[dir='ltr']")!;
    expect(outer.textContent).toBe(`${unit("en")} 1,250.00`);
    expect(getByRole("img", { name: "Saudi riyal" })).toBeInTheDocument();
  });

  it("never hard-codes the unit: it is what lib/format/money.ts produces", () => {
    expect(unit("ar").length).toBeGreaterThan(0);
  });

  it("shows compareAt only when it is greater, struck through with an sr-only label", () => {
    const { container, rerender } = renderWithIntl(<Price halalas={185000} compareAt={220000} />, "ar");
    const s = container.querySelector("s")!;
    expect(s).toBeTruthy();
    expect(s.textContent).toContain("السعر قبل الخصم");
    expect(s.textContent).toContain("2,200.00");
    rerender(<Price halalas={185000} compareAt={185000} />);
    expect(container.querySelector("s")).toBeNull();
  });

  it("negative amounts use U+2212 inside the number", () => {
    const { container } = renderWithIntl(<Price halalas={-15000} />, "ar");
    expect(container.textContent).toContain("−150.00");
  });

  it("free variant has no unit", () => {
    const { container, queryByRole } = renderWithIntl(<Price halalas={0} variant="free" />, "ar");
    expect(container.textContent).toBe("مجاني");
    expect(queryByRole("img")).toBeNull();
  });

  it("rejects non-integer halalas (D7)", () => {
    expect(() => renderWithIntl(<Price halalas={12.5} />, "ar")).toThrow(/integer halalas/);
  });

  it("DiscountBadge isolates the sign LTR and reads as words", () => {
    const { container, getByText } = renderWithIntl(<DiscountBadge percent={22} />, "ar");
    expect(container.querySelector("bdi[dir='ltr']")?.textContent).toBe("−22%");
    expect(getByText("خصم 22 بالمئة")).toHaveClass("sr-only");
  });
});
