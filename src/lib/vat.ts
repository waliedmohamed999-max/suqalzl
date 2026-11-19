/**
 * VAT helpers (SPEC 6.1, finance.md §6.1). Prices are VAT-inclusive (D8).
 *   vatOfGross(g) = roundHalfUp(g × r / (10000 + r))   with r = 1500 → g × 15/115
 *   netOfGross(g) = g − vatOfGross(g)
 *   vatOnNet(n)   = roundHalfUp(n × r / 10000)         → n × 15/100
 * The rate comes from Setting.vatRate (bps, default 1500) and is frozen on Order/SubOrder/OrderItem.
 */
import { assertHalalas, divRoundHalfUp, type Halalas } from "./money";

export const DEFAULT_VAT_RATE_BP = 1500;

function assertRate(rateBp: number) {
  if (!Number.isInteger(rateBp) || rateBp < 0 || rateBp > 10_000) throw new RangeError(`invalid VAT rate ${rateBp} bp`);
}

export function vatOfGross(gross: Halalas, rateBp: number = DEFAULT_VAT_RATE_BP): Halalas {
  assertHalalas(gross, "gross");
  assertRate(rateBp);
  return divRoundHalfUp(BigInt(gross) * BigInt(rateBp), 10_000 + rateBp);
}

export function netOfGross(gross: Halalas, rateBp: number = DEFAULT_VAT_RATE_BP): Halalas {
  return gross - vatOfGross(gross, rateBp);
}

export function vatOnNet(net: Halalas, rateBp: number = DEFAULT_VAT_RATE_BP): Halalas {
  assertHalalas(net, "net");
  assertRate(rateBp);
  return divRoundHalfUp(BigInt(net) * BigInt(rateBp), 10_000);
}

export function grossOfNet(net: Halalas, rateBp: number = DEFAULT_VAT_RATE_BP): Halalas {
  return net + vatOnNet(net, rateBp);
}

/** Split a VAT-inclusive line into { net, vat } with net + vat === gross exactly. */
export function splitGross(gross: Halalas, rateBp: number = DEFAULT_VAT_RATE_BP): { net: Halalas; vat: Halalas } {
  const vat = vatOfGross(gross, rateBp);
  return { net: gross - vat, vat };
}
