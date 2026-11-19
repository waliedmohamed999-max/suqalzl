import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";
import * as catalog from "@/features/catalog/schema";
import * as cart from "@/features/cart/schema";
import * as orders from "@/features/orders/schema";
import * as pages from "@/features/pages/schema";
import * as adminSchema from "@/features/admin/schema";
import { sanitizeDescription, slugify, sniffImage } from "@/features/admin/products";
import { periodBounds, SECTION_PERMISSION } from "@/features/admin/queries";
import { CodedError, toActionError } from "@/features/common/action";
import { assertSafeKey } from "@/lib/providers/storage/local";
import { NotFoundError } from "@/lib/db";
import { PermissionDeniedError, UnauthorizedError, can, type Principal } from "@/lib/permissions";
import { UploadRejectedError } from "@/lib/providers/storage";
import { demoSvg, DEMO_PRODUCTS } from "../../prisma/seed-demo";

const FORBIDDEN = [
  "floorPrice",
  "autoAcceptPrice",
  "iban",
  "ibanLast4",
  "passwordHash",
  "legalName",
  "crNumber",
  "freelanceDocNumber",
  "vatNumber",
  "bankName",
  "accountHolderName",
  "pickupAddress",
  "ownerUserId",
  "commissionRate",
  "commissionAmount",
  "vendorNet",
  "vendorPayable",
  "reservedStock",
  "stock",
  "guestTokenHash",
];

function schemaKeys(schema: z.ZodType): Set<string> {
  const out = new Set<string>();
  const walk = (s: unknown) => {
    if (Array.isArray(s)) return s.forEach(walk);
    if (!s || typeof s !== "object") return;
    for (const [k, v] of Object.entries(s)) {
      if (k === "properties" && v && typeof v === "object") Object.keys(v).forEach((p) => out.add(p));
      walk(v);
    }
  };
  walk(z.toJSONSchema(schema, { unrepresentable: "any" }));
  return out;
}

describe("leak test on the contracts: public DTO schemas cannot carry secrets (.strict())", () => {
  const publicSchemas: [string, z.ZodType][] = [
    ["homeDTO", catalog.homeDTO],
    ["productListDTO", catalog.productListDTO],
    ["productDetailDTO", catalog.productDetailDTO],
    ["bundleDetailDTO", catalog.bundleDetailDTO],
    ["searchResultDTO", catalog.searchResultDTO],
    ["searchSuggestDTO", catalog.searchSuggestDTO],
    ["categoryDTO", catalog.categoryDTO],
    ["publicVendorDTO", catalog.publicVendorDTO],
    ["cartDTO", cart.cartDTO],
    ["checkoutAddressStepDTO", cart.checkoutAddressStepDTO],
    ["shippingQuoteDTO", cart.shippingQuoteDTO],
    ["customerOrderListDTO", orders.customerOrderListDTO],
    ["customerOrderDetailDTO", orders.customerOrderDetailDTO],
    ["pageDTO", pages.pageDTO],
  ];
  it.each(publicSchemas)("%s", (_name, schema) => {
    const keys = schemaKeys(schema);
    expect(keys.size).toBeGreaterThan(0);
    for (const k of FORBIDDEN) expect(keys.has(k), k).toBe(false);
  });
  it("admin DTOs never carry password hashes, IBAN or negotiation floors", () => {
    for (const s of [
      adminSchema.adminProductDetailDTO,
      adminSchema.adminStaffListDTO,
      adminSchema.adminCustomerDetailDTO,
      adminSchema.adminOrderDetailDTO,
    ]) {
      const keys = schemaKeys(s);
      for (const k of ["passwordHash", "iban", "floorPrice", "autoAcceptPrice", "legalName"])
        expect(keys.has(k), k).toBe(false);
    }
  });
  it("strict outputs reject an extra key", () => {
    expect(() => catalog.publicVendorDTO.parse({ ...sampleVendor(), legalName: "x" })).toThrow(ZodError);
  });
});

function sampleVendor() {
  return {
    id: crypto.randomUUID(),
    slug: "s",
    storeNameAr: "م",
    storeNameEn: "S",
    logoPath: null,
    coverPath: null,
    descriptionAr: null,
    descriptionEn: null,
    cityId: null,
    ratingAvg: "4.50",
    ratingCount: 1,
    avgResponseMinutes: null,
    acceptanceRateBps: null,
  };
}

describe("product list URL params (D33-3 filters)", () => {
  it("parses valid values and drops invalid ones", () => {
    const q = catalog.parseProductListParams(
      new URLSearchParams(
        "sort=price_desc&priceMin=1000&priceMax=x&onSale=1&inStock=maybe&page=3&vendor=souq&perPage=999",
      ),
      { locale: "en", category: "bisht" },
    );
    expect(q).toMatchObject({
      locale: "en",
      category: "bisht",
      sort: "price_desc",
      priceMin: 1000,
      onSale: true,
      inStock: false,
      page: 3,
      vendor: "souq",
    });
    expect(q.priceMax).toBeUndefined();
    // an out-of-range value is dropped on its own (never throws, never resets the others)
    expect(q.perPage).toBe(24);
    const r = catalog.parseProductListParams({ sort: ["newest", "x"], vendor: "../etc" });
    expect(r.sort).toBe("newest");
    expect(r.vendor).toBeUndefined();
  });
});

describe("admin helpers", () => {
  it("slugify / sanitizeDescription", () => {
    expect(slugify("Classic Bisht — Gold & Black")).toBe("classic-bisht-gold-black");
    expect(slugify("بشت")).toBe("product");
    expect(sanitizeDescription("<b>عنوان</b>\r\nسطر‮\n\n\n\n=SUM(A1)")).toBe("عنوان\nسطر\n\nSUM(A1)");
    expect(sanitizeDescription("   ")).toBeNull();
  });
  it("sniffImage: declared type must match the bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffImage(png, "image/png").ext).toBe("png");
    expect(() => sniffImage(png, "image/jpeg")).toThrow(UploadRejectedError);
    expect(() => sniffImage(new TextEncoder().encode("<svg onload=x>"), "image/png")).toThrow(UploadRejectedError);
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg").ext).toBe("jpg");
  });
  it("Riyadh 'today' starts at 00:00 +03:00", () => {
    const b = periodBounds("today", new Date("2026-11-19T22:30:00Z")); // 01:30 on the 20th in Riyadh
    expect(b.from.toISOString()).toBe("2026-11-19T21:00:00.000Z");
    expect(b.prevTo.getTime()).toBe(b.from.getTime());
  });
  it("section matrix: staff/audit are SUPER_ADMIN only", () => {
    const staff: Principal = {
      kind: "staff",
      userId: crypto.randomUUID(),
      role: "STAFF",
      permissions: [
        "orders.manage",
        "settings.manage",
        "products.review",
        "customers.view",
        "reports.view",
        "cms.manage",
        "vendors.manage",
        "payouts.manage",
      ],
    };
    expect(can(staff, SECTION_PERMISSION.staff)).toBe(false);
    expect(can(staff, SECTION_PERMISSION.audit)).toBe(false);
    expect(can(staff, SECTION_PERMISSION.products)).toBe(true);
  });
});

describe("toActionError", () => {
  it("maps known errors to stable codes and hides the rest", () => {
    expect(toActionError(new UnauthorizedError())).toEqual({ ok: false, code: "UNAUTHORIZED" });
    expect(toActionError(new PermissionDeniedError())).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(toActionError(new NotFoundError())).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(toActionError(new CodedError("SKU_TAKEN"))).toEqual({ ok: false, code: "SKU_TAKEN" });
    expect(toActionError(new UploadRejectedError("SIZE"))).toEqual({ ok: false, code: "UPLOAD_REJECTED_SIZE" });
    const v = toActionError(z.object({ a: z.number() }).safeParse({ a: "x" }).error);
    expect(v).toMatchObject({ ok: false, code: "VALIDATION", issues: [{ path: "a" }] });
    const orig = console.error;
    console.error = () => {};
    expect(toActionError(new Error("password=hunter2"))).toEqual({ ok: false, code: "INTERNAL" });
    console.error = orig;
  });
});

describe("local storage keys and demo illustrations", () => {
  it("rejects traversal and odd keys", () => {
    expect(assertSafeKey("demo/products/a-1.svg")).toHaveLength(3);
    for (const bad of ["../x", "a/../../b", "/etc/passwd", "a//b", "a/.hidden", "a/b c"])
      expect(() => assertSafeKey(bad), bad).toThrow();
  });
  it("demo SVGs are neutral: no script, no external refs, labelled as illustrative", () => {
    for (const d of DEMO_PRODUCTS.slice(0, 10)) {
      const svg = demoSvg(d.slug);
      expect(svg).not.toMatch(/<script|on\w+=|href|xlink|http(?!:\/\/www\.w3\.org)/i);
      expect(svg).toContain("صورة توضيحية");
    }
    expect(DEMO_PRODUCTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(DEMO_PRODUCTS.map((d) => d.cat)).size).toBe(14);
    expect(DEMO_PRODUCTS.every((d) => Number.isInteger(d.price) && d.price > 0)).toBe(true);
  });
});
