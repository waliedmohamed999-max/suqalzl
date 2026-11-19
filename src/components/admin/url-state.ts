"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * URL state for admin lists (README 4.6: "كل الحالة في الـ URL"). Every change resets ?page and
 * uses router.replace inside a transition so the RSC page refetches without a history entry per
 * keystroke. (nuqs is not a dependency; this is the small subset we need.)
 */
export function useUrlState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hrefWith = useCallback(
    (patch: Record<string, string | null | undefined>, keepPage = false) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!keepPage && !("page" in patch)) next.delete("page");
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname],
  );

  const set = useCallback(
    (patch: Record<string, string | null | undefined>, keepPage = false) => {
      const href = hrefWith(patch, keepPage);
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [hrefWith, router],
  );

  return { params, get: (k: string) => params.get(k), set, hrefWith, pending };
}
