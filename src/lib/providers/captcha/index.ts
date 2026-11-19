/**
 * CaptchaProvider (D36-2, QA-B5). Asked ONLY when an identity-wide counter (e-mail or phone alone) is
 * exceeded on an untrusted device — instead of locking the account. External CAPTCHA (Turnstile,
 * hCaptcha, reCAPTCHA) is a new data processor and awaits the owner (O15); until then the
 * implementation is a self-hosted proof-of-work: no third party, no personal data, no cost.
 *
 * POW protocol (stateless, HMAC-signed):
 *   POST /api/auth/challenge -> { provider: "POW", token, difficultyBits, expiresAt }
 *   client finds `solution` (decimal string) such that sha256(`${token}:${solution}`) starts with
 *   `difficultyBits` zero bits, then sends { captcha: { token, solution } } with the login/OTP request.
 * Each token is single-use (replay guard in rate_limit_buckets) and expires (captcha.ttlSeconds).
 */
import { createHash, randomUUID } from "node:crypto";
import type { Tx } from "../../db";
import { env } from "../../env";
import { hmacSha256, safeEqual } from "../../auth/crypto";
import { hitRateLimit } from "../../auth/rate-limit";
import { getSetting } from "../../settings";

export interface CaptchaChallenge {
  provider: "POW";
  token: string;
  difficultyBits: number;
  expiresAt: string;
  algorithm: "sha256-leading-zero-bits";
}

export interface CaptchaAnswer {
  token: string;
  solution: string;
}

export interface CaptchaProvider {
  readonly name: "POW";
  issue(tx: Tx): Promise<CaptchaChallenge>;
  /** true once per valid, unexpired, correctly solved challenge (consumes it). */
  verify(tx: Tx, answer: CaptchaAnswer | null | undefined): Promise<boolean>;
}

interface PowClaims {
  id: string;
  d: number;
  exp: number;
}

const key = () => hmacSha256(env().OTP_HMAC_SECRET, "captcha:pow:v1");

export function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const n = parseInt(ch, 16);
    if (n === 0) {
      bits += 4;
      continue;
    }
    return bits + Math.clz32(n) - 28;
  }
  return bits;
}

export function powHash(token: string, solution: string): string {
  return createHash("sha256").update(`${token}:${solution}`).digest("hex");
}

/** Reference solver (tests, dev tools). The browser implementation lives in the UI (P1-02). */
export function solvePow(token: string, difficultyBits: number, maxIterations = 50_000_000): string {
  for (let i = 0; i < maxIterations; i++) {
    if (leadingZeroBits(powHash(token, String(i))) >= difficultyBits) return String(i);
  }
  throw new Error("no solution found");
}

export class PowCaptchaProvider implements CaptchaProvider {
  readonly name = "POW" as const;

  async issue(tx: Tx): Promise<CaptchaChallenge> {
    const cfg = await getSetting(tx, "captcha");
    const claims: PowClaims = { id: randomUUID(), d: cfg.powDifficultyBits, exp: Date.now() + cfg.ttlSeconds * 1000 };
    const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return {
      provider: "POW",
      token: `${body}.${hmacSha256(key(), body)}`,
      difficultyBits: claims.d,
      expiresAt: new Date(claims.exp).toISOString(),
      algorithm: "sha256-leading-zero-bits",
    };
  }

  async verify(tx: Tx, answer: CaptchaAnswer | null | undefined): Promise<boolean> {
    if (!answer || !/^\d{1,16}$/.test(answer.solution)) return false;
    const [body, sig] = answer.token.split(".");
    if (!body || !sig || !safeEqual(sig, hmacSha256(key(), body))) return false;
    let claims: PowClaims;
    try {
      claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PowClaims;
    } catch {
      return false;
    }
    if (typeof claims.exp !== "number" || claims.exp <= Date.now()) return false;
    // the difficulty in force NOW is the floor: lowering the setting never weakens issued tokens,
    // raising it invalidates easier ones
    const cfg = await getSetting(tx, "captcha");
    const need = Math.max(claims.d, cfg.powDifficultyBits);
    if (leadingZeroBits(powHash(answer.token, answer.solution)) < need) return false;
    const ttl = Math.max(1, Math.ceil((claims.exp - Date.now()) / 1000));
    const used = await hitRateLimit(tx, `captcha:used:${claims.id}`, 1, ttl);
    return used.allowed;
  }
}

let instance: CaptchaProvider | undefined;
export function captchaProvider(): CaptchaProvider {
  return (instance ??= new PowCaptchaProvider());
}
