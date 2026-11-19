import "server-only";
import { unstable_cache } from "next/cache";
import { withCtx } from "@/lib/db";
import type { Principal } from "@/lib/permissions";
import { DEFAULT_SETTINGS, settingSchemas } from "@/lib/settings";

/**
 * Read-only data for the layouts (header, mobile menu, footer, WhatsApp button, dashboard sidebar).
 * Owned by frontend-engineer (P1-02); backend-engineer to review. Public data runs in the `public`
 * RLS context (categories_read: active only; settings_public_read: is_public only). Results are
 * DTOs, never Prisma rows. Cached with tags so P3 admin edits can revalidateTag("categories"|"settings").
 */

export interface NavCategoryDTO {
  slug: string;
  name: string;
}

export interface StoreShellDTO {
  /** null = the query failed: the menu shows its "couldn't load categories" state. */
  categories: NavCategoryDTO[] | null;
  whatsappNumber: string | null;
  storeInfo: { name: string; crNumber: string | null; vatNumber: string | null };
}

const loadPublicShell = unstable_cache(
  async () =>
    withCtx({ kind: "public" }, async (tx) => {
      const [cats, settings] = await Promise.all([
        tx.category.findMany({
          where: { parentId: null },
          orderBy: [{ sort: "asc" }, { nameAr: "asc" }],
          select: { slug: true, nameAr: true, nameEn: true },
        }),
        tx.setting.findMany({
          where: { key: { in: ["whatsappNumber", "storeInfo"] } },
          select: { key: true, value: true },
        }),
      ]);
      const byKey = new Map(settings.map((s) => [s.key, s.value]));
      const wa = settingSchemas.whatsappNumber.safeParse(byKey.get("whatsappNumber"));
      const info = settingSchemas.storeInfo.safeParse(byKey.get("storeInfo"));
      return {
        categories: cats,
        whatsappNumber: wa.success ? wa.data : DEFAULT_SETTINGS.whatsappNumber,
        storeInfo: info.success ? info.data : DEFAULT_SETTINGS.storeInfo,
      };
    }),
  ["store-shell-v1"],
  { tags: ["categories", "settings"], revalidate: 300 },
);

export async function getStoreShell(locale: string): Promise<StoreShellDTO> {
  try {
    const d = await loadPublicShell();
    return {
      categories: d.categories.map((c) => ({ slug: c.slug, name: locale === "en" ? c.nameEn : c.nameAr })),
      whatsappNumber: d.whatsappNumber,
      storeInfo: {
        name: locale === "en" ? d.storeInfo.nameEn : d.storeInfo.nameAr,
        crNumber: d.storeInfo.crNumber,
        vatNumber: d.storeInfo.vatNumber,
      },
    };
  } catch (e) {
    console.error("[shell] store shell query failed", e instanceof Error ? e.message : e);
    return {
      categories: null,
      whatsappNumber: null,
      storeInfo: {
        name: locale === "en" ? DEFAULT_SETTINGS.storeInfo.nameEn : DEFAULT_SETTINGS.storeInfo.nameAr,
        crNumber: null,
        vatNumber: null,
      },
    };
  }
}

export interface VendorShellDTO {
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
}

/** Store name + status for the vendor sidebar. vendorId comes from the session only (rule 8). */
export async function getVendorShell(principal: Principal): Promise<VendorShellDTO | null> {
  if (principal.kind !== "vendor") return null;
  return withCtx({ kind: "vendor", userId: principal.userId, vendorId: principal.vendorId }, async (tx) => {
    const v = await tx.vendor.findUnique({
      where: { id: principal.vendorId },
      select: { storeNameAr: true, status: true },
    });
    return v ? { name: v.storeNameAr, status: v.status as VendorShellDTO["status"] } : null;
  });
}
