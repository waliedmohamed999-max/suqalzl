/**
 * Browser solver for the self-hosted proof-of-work challenge (D36-2, src/lib/providers/captcha):
 * find `solution` (decimal string) so that sha256(`${token}:${solution}`) starts with
 * `difficultyBits` zero bits. Same algorithm as the reference solvePow(), on WebCrypto.
 * Hashes run in parallel batches; the main thread yields between batches so the UI stays responsive.
 */
const enc = new TextEncoder();

export function leadingZeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const b of bytes) {
    if (b === 0) {
      bits += 8;
      continue;
    }
    return bits + Math.clz32(b) - 24;
  }
  return bits;
}

export async function solvePowInBrowser(
  token: string,
  difficultyBits: number,
  opts: { batch?: number; maxIterations?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const batch = opts.batch ?? 512;
  const max = opts.maxIterations ?? 20_000_000;
  const subtle = globalThis.crypto.subtle;
  for (let start = 0; start < max; start += batch) {
    if (opts.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const hashes = await Promise.all(
      Array.from({ length: batch }, (_, i) => subtle.digest("SHA-256", enc.encode(`${token}:${start + i}`))),
    );
    const hit = hashes.findIndex((h) => leadingZeroBits(new Uint8Array(h)) >= difficultyBits);
    if (hit >= 0) return String(start + hit);
  }
  throw new Error("no solution found");
}
