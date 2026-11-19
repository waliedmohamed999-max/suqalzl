import { z } from "zod";
import { isoDate, locale } from "@/features/common/schema";

/**
 * Policy/content pages (/pages/[slug], P2-05 display only in M1). Content is MARKDOWN written by
 * the admin (or the seed from docs/legal drafts v0.2). Render it with a markdown renderer that
 * escapes raw HTML (no dangerouslySetInnerHTML of the source).
 */
export const PAGE_SLUGS = ["privacy", "returns", "terms", "faq", "shipping", "about", "vendor-agreement"] as const;
export const pageSlug = z.enum(PAGE_SLUGS);

export const pageDTO = z
  .object({
    slug: z.string(),
    title: z.string(),
    format: z.literal("markdown"),
    content: z.string(),
    /** the requested locale had no text and the Arabic version is returned */
    fallbackLocale: z.boolean(),
    updatedAt: isoDate,
  })
  .strict();
export type PageDTO = z.infer<typeof pageDTO>;

export const pageLinkDTO = z.object({ slug: z.string(), title: z.string() }).strict();
export type PageLinkDTO = z.infer<typeof pageLinkDTO>;

export const pageInput = z
  .object({ slug: z.string().regex(/^[a-z0-9-]{1,40}$/), locale: locale.default("ar") })
  .strict();
