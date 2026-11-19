"use server";
import { toActionError } from "@/features/common/action";
import type { ActionResult } from "@/features/common/schema";
import { searchSuggest } from "./queries";
import type { SearchSuggestDTO } from "./schema";

/**
 * Public, read-only (no permission needed: anonymous visitors search too). Server Components call
 * the queries in ./queries directly; this action exists for the client-side search box.
 */
export async function searchSuggestAction(input: unknown): Promise<ActionResult<SearchSuggestDTO>> {
  try {
    return { ok: true, data: await searchSuggest(input as { q: string }) };
  } catch (e) {
    return toActionError(e);
  }
}
