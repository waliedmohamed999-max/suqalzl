import "server-only";
import { NotFoundError, withCtx } from "@/lib/db";
import type { Locale } from "@/features/common/schema";
import { pageDTO, pageInput, pageLinkDTO, type PageDTO, type PageLinkDTO } from "./schema";

/** /pages/[slug] (P2-05 display). `public` context: pages_read = active pages only. */
export async function getPage(slugValue: string, locale: Locale = "ar"): Promise<PageDTO> {
  const q = pageInput.parse({ slug: slugValue, locale });
  return withCtx({ kind: "public" }, async (tx) => {
    const p = await tx.page.findUnique({ where: { slug: q.slug } });
    if (!p) throw new NotFoundError();
    const useEn = q.locale === "en" && p.contentEn.trim() !== "";
    return pageDTO.parse({
      slug: p.slug,
      title: useEn ? p.titleEn || p.titleAr : p.titleAr,
      format: "markdown",
      content: useEn ? p.contentEn : p.contentAr,
      fallbackLocale: q.locale === "en" && !useEn,
      updatedAt: p.updatedAt.toISOString(),
    });
  });
}

/** Footer links. */
export async function listPages(locale: Locale = "ar"): Promise<PageLinkDTO[]> {
  return withCtx({ kind: "public" }, async (tx) => {
    const rows = await tx.page.findMany({
      orderBy: { slug: "asc" },
      select: { slug: true, titleAr: true, titleEn: true },
    });
    return rows.map((r) =>
      pageLinkDTO.parse({ slug: r.slug, title: locale === "en" ? r.titleEn || r.titleAr : r.titleAr }),
    );
  });
}
