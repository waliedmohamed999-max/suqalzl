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
    for (const m of [ar, en]) for (const k of keys(m)) expect(k.split(".").reduce<any>((o, p) => o[p], m), k).not.toBe(""); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});
