/**
 * Money = integer halalas (D7, CLAUDE.md rule 5). No Float anywhere in money math.
 * Rounding is ROUND_HALF_UP (half away from zero) everywhere (SPEC 6.1, finance.md §6).
 * Intermediate products use BigInt so a × b never loses precision.
 */
import { toLatinDigits } from "./format/digits";

export { formatSAR, formatSARParts, toDecimalString, RIYAL_SIGN_READY } from "./format/money";
export type { MoneyDisplay, MoneyLocale } from "./format/money";

export type Halalas = number;
export const HALALAS_PER_RIYAL = 100;
/** basis points: 10000 = 100% */
export const BPS = 10_000;

export function assertHalalas(value: number, name = "amount"): asserts value is Halalas {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} must be an integer number of halalas, got ${value}`);
}

/** round(numerator / denominator) with ROUND_HALF_UP; exact for any safe integers. */
export function divRoundHalfUp(numerator: number | bigint, denominator: number | bigint): number {
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  if (d === 0n) throw new RangeError("division by zero");
  const neg = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (2n * ad);
  const r = neg ? -q : q;
  const out = Number(r);
  if (!Number.isSafeInteger(out)) throw new RangeError("result out of safe integer range");
  return out;
}

/** round(a × b / c), ROUND_HALF_UP, no intermediate float. */
export function mulDivRoundHalfUp(a: number, b: number, c: number): number {
  return divRoundHalfUp(BigInt(a) * BigInt(b), BigInt(c));
}

/** amount × bps / 10000 (commission, percent coupon). */
export function applyBps(amount: Halalas, bps: number): Halalas {
  assertHalalas(amount);
  if (!Number.isInteger(bps)) throw new TypeError("bps must be an integer");
  return mulDivRoundHalfUp(amount, bps, BPS);
}

/**
 * Split `total` across `weights` proportionally so the parts sum EXACTLY to total
 * (largest-remainder / Hamilton method; finance.md TC6, backend.md H12).
 * Ties on the remainder go to the earlier index (deterministic).
 */
export function allocateLargestRemainder(total: Halalas, weights: readonly number[]): Halalas[] {
  assertHalalas(total, "total");
  if (weights.length === 0) throw new RangeError("weights must not be empty");
  for (const w of weights)
    if (!Number.isSafeInteger(w) || w < 0) throw new TypeError("weights must be non-negative integers");
  const sumW = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (sumW === 0n) {
    if (total === 0) return weights.map(() => 0);
    throw new RangeError("cannot allocate a non-zero total over zero weights");
  }
  const neg = total < 0;
  const T = BigInt(Math.abs(total));
  const base = weights.map((w) => (T * BigInt(w)) / sumW);
  const rem = weights.map((w, i) => ({ i, r: (T * BigInt(w)) % sumW }));
  let left = T - base.reduce((a, b) => a + b, 0n);
  rem.sort((a, b) => (b.r > a.r ? 1 : b.r < a.r ? -1 : a.i - b.i));
  for (const { i } of rem) {
    if (left === 0n) break;
    base[i] = base[i]! + 1n;
    left -= 1n;
  }
  return base.map((v) => (neg ? -Number(v) : Number(v)));
}

/**
 * Parse a customer/vendor typed amount in RIYALS ("1,250.50", "١٢٥٠٫٥", "1250") into halalas.
 * Max 2 decimals (SPEC 6.8 / P1-00 §8-11: customer input in riyals, API always in halalas).
 */
export function toHalalas(input: string | number): Halalas {
  if (typeof input === "number") {
    if (Number.isInteger(input)) return input * HALALAS_PER_RIYAL;
    // Avoid binary float: go through its shortest decimal representation.
    input = String(input);
  }
  const s = toLatinDigits(input).trim().replace(/[\s,]/g, "");
  const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) throw new RangeError(`invalid amount: "${input}"`);
  const riyals = BigInt(m[2]!);
  const frac = BigInt((m[3] ?? "").padEnd(2, "0") || "0");
  const v = riyals * 100n + frac;
  const out = Number(m[1] ? -v : v);
  if (!Number.isSafeInteger(out)) throw new RangeError("amount too large");
  return out;
}

export function sumHalalas(values: readonly Halalas[]): Halalas {
  let t = 0;
  for (const v of values) {
    assertHalalas(v);
    t += v;
  }
  assertHalalas(t, "sum");
  return t;
}
