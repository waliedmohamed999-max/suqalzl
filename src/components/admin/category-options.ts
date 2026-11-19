import type { AdminCategoryDTO } from "@/features/admin/schema";

/** Flat options for selects and filters: parents, then "parent ← child" (server or client). */
export function categoryOptions(tree: AdminCategoryDTO[]): { id: string; label: string }[] {
  return tree.flatMap((c) => [
    { id: c.id, label: c.nameAr },
    ...c.children.map((k) => ({ id: k.id, label: `${c.nameAr} ← ${k.nameAr}` })),
  ]);
}
