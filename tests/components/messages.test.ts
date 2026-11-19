import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

function keys(o: unknown, prefix = ""): string[] {
  if (typeof o !== "object" || o === null) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("messages (CLAUDE.md rule 6)", () => {
  it("ar and en have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(ar).sort());
  });
  it("no empty strings", () => {
    const get = (o: unknown, path: string) =>
      path.split(".").reduce<unknown>((acc, p) => (acc as Record<string, unknown>)[p], o);
    for (const m of [ar, en]) for (const k of keys(m)) expect(get(m, k), k).not.toBe("");
  });
});
