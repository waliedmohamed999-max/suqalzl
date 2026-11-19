/**
 * Deterministic sample data generated from Zod schemas (D30): allowed ONLY in tests and in the
 * development component catalogue (/dev/components, *.dev.tsx). ESLint forbids importing src/dev/*
 * from app code, and the catalogue route does not exist in production builds (next.config pageExtensions).
 * Works from the JSON Schema of the Zod schema (z.toJSONSchema), so it follows the backend contracts.
 */
import { z } from "zod";

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  default?: unknown;
  pattern?: string;
};

/** mulberry32: small seeded PRNG so every render/test gets the same data. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ["bisht", "oud", "saffron", "farwa", "agal", "mabkhara", "shal", "masbaha"];

function uuid(r: () => number) {
  const h = () => Math.floor(r() * 16).toString(16);
  const s = (n: number) => Array.from({ length: n }, h).join("");
  return `${s(8)}-${s(4)}-4${s(3)}-${"89ab"[Math.floor(r() * 4)]}${s(3)}-${s(12)}`;
}

function gen(s: JsonSchema, r: () => number): unknown {
  if (s.const !== undefined) return s.const;
  if (s.enum) return s.enum[Math.floor(r() * s.enum.length)];
  const alts = s.anyOf ?? s.oneOf;
  if (alts) {
    const nonNull = alts.filter((a) => a.type !== "null");
    return gen(nonNull[Math.floor(r() * nonNull.length)] ?? alts[0]!, r);
  }
  const type = Array.isArray(s.type) ? s.type.find((t) => t !== "null") : s.type;
  switch (type) {
    case "integer":
    case "number": {
      const min = s.minimum ?? (s.exclusiveMinimum != null ? s.exclusiveMinimum + 1 : 0);
      const max = s.maximum ?? (s.exclusiveMaximum != null ? s.exclusiveMaximum - 1 : min + 1000);
      return Math.floor(min + r() * (max - min + 1));
    }
    case "boolean":
      return r() < 0.5;
    case "string": {
      if (s.format === "uuid") return uuid(r);
      if (s.format === "email") return `user${Math.floor(r() * 1000)}@example.com`;
      if (s.format === "date-time") return new Date(Date.UTC(2026, 10, 1 + Math.floor(r() * 28))).toISOString();
      const min = s.minLength ?? 3;
      const max = Math.max(min, s.maxLength ?? 24);
      let out = "";
      while (out.length < min) out += (out ? " " : "") + WORDS[Math.floor(r() * WORDS.length)];
      return out.slice(0, max);
    }
    case "array": {
      const min = s.minItems ?? 1;
      const max = Math.max(min, s.maxItems ?? 3);
      const n = min + Math.floor(r() * (max - min + 1));
      return Array.from({ length: n }, () => gen(s.items ?? {}, r));
    }
    case "object": {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(s.properties ?? {})) out[k] = gen(v, r);
      return out;
    }
    case "null":
      return null;
    default:
      return s.default ?? null;
  }
}

/** One valid sample for `schema` (parsed back through the schema, so it is guaranteed valid). */
export function sample<T extends z.ZodType>(schema: T, seed = 1): z.output<T> {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonSchema;
  return schema.parse(gen(json, rng(seed)));
}

export function samples<T extends z.ZodType>(schema: T, count: number, seed = 1): z.output<T>[] {
  return Array.from({ length: count }, (_, i) => sample(schema, seed + i));
}
