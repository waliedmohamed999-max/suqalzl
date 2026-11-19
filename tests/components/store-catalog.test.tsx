import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  catalogHref,
  clearedFilters,
  halalasToRiyalsInput,
  riyalsToHalalas,
  type CatalogQuery,
} from "@/components/store/catalog-url";
import { parseMarkdown } from "@/components/store/markdown";
import { discountPercent } from "@/components/store/price";
import { parseProductListParams } from "@/features/catalog/schema";

const base: CatalogQuery = { onSale: false, inStock: false, sort: "featured", page: 1 };

describe("catalog URL (matches the backend parseProductListParams)", () => {
  it("round-trips through the backend parser", () => {
    const q: CatalogQuery = {
      ...base,
      priceMin: 100_000,
      priceMax: 300_000,
      vendor: "souq",
      onSale: true,
      inStock: true,
      sort: "price_asc",
      page: 2,
    };
    const href = catalogHref("/c/bisht", q);
    expect(href).toBe("/c/bisht?priceMin=100000&priceMax=300000&vendor=souq&onSale=1&inStock=1&sort=price_asc&page=2");
    const parsed = parseProductListParams(new URLSearchParams(href.split("?")[1]));
    expect(parsed).toMatchObject({
      priceMin: 100_000,
      priceMax: 300_000,
      vendor: "souq",
      onSale: true,
      inStock: true,
      sort: "price_asc",
      page: 2,
    });
  });

  it("drops defaults (featured sort, page 1) so every filter set has one URL", () => {
    expect(catalogHref("/products", base)).toBe("/products");
  });

  it("counts and clears filters but keeps sort and q", () => {
    const q: CatalogQuery = { ...base, q: "بشت", priceMin: 1, vendor: "x", onSale: true, sort: "newest", page: 3 };
    expect(activeFilterCount(q)).toBe(3);
    expect(clearedFilters(q)).toEqual({ ...base, q: "بشت", sort: "newest" });
  });

  it("converts whole riyals with integer arithmetic only", () => {
    expect(riyalsToHalalas("1250")).toBe(125_000);
    expect(riyalsToHalalas("12.5")).toBeUndefined();
    expect(riyalsToHalalas("")).toBeUndefined();
    expect(halalasToRiyalsInput(125_099)).toBe("1250");
    expect(halalasToRiyalsInput(undefined)).toBe("");
  });
});

describe("discountPercent (display only)", () => {
  it("floors to a whole percent and ignores non-discounts", () => {
    expect(discountPercent(185_000, 220_000)).toBe(15);
    expect(discountPercent(100, 100)).toBeNull();
    expect(discountPercent(100, null)).toBeNull();
    expect(discountPercent(9_999, 10_000)).toBeNull();
  });
});

describe("parseMarkdown (policy pages, no raw HTML)", () => {
  it("parses headings, lists, quotes and paragraphs", () => {
    const blocks = parseMarkdown(
      "# العنوان\n\nفقرة أولى\nتكملة\n\n- بند 1\n- بند 2\n\n1. أول\n2. ثاني\n\n> ملاحظة\n\n---",
    );
    expect(blocks.map((b) => b.t)).toEqual(["h", "p", "ul", "ol", "quote", "hr"]);
    expect(blocks[1]).toEqual({ t: "p", text: "فقرة أولى تكملة" });
  });

  it("keeps HTML as text", () => {
    const [b] = parseMarkdown("<script>alert(1)</script>");
    expect(b).toEqual({ t: "p", text: "<script>alert(1)</script>" });
  });
});
