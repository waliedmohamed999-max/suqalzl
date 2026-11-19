/**
 * Browser-side calls to the auth Route Handlers (src/app/api/auth/*, backend P1-01).
 * Contracts: src/features/auth/schema.ts (inputs are .strict(): never send extra keys).
 * Errors come back as { error: { code, retryAt? } } and are mapped to messages "errors.*" by
 * errorMessageKey(). The UI never shows server text.
 */
import type { SessionDTO } from "./schema";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; retryAt?: string; status: number };

export async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "NETWORK", status: 0 };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (res.ok) return { ok: true, data: json as T };
  const err = (json as { error?: { code?: string; retryAt?: string } } | null)?.error;
  return { ok: false, code: err?.code ?? "INTERNAL", retryAt: err?.retryAt, status: res.status };
}

interface PowChallenge {
  provider: "POW";
  token: string;
  difficultyBits: number;
  expiresAt: string;
}

/**
 * POST that transparently answers a 428 CHALLENGE_REQUIRED (D36-2): fetch a proof-of-work
 * challenge, solve it in the browser, and send the same body again with `captcha: { token, solution }`.
 * Only login / OTP-request endpoints answer 428. `onSolving` lets the form show a short status.
 */
export async function postWithChallenge<T>(
  url: string,
  body: Record<string, unknown>,
  onSolving?: (solving: boolean) => void,
): Promise<ApiResult<T>> {
  const first = await postJson<T>(url, body);
  if (first.ok || first.code !== "CHALLENGE_REQUIRED") return first;
  const ch = await postJson<PowChallenge>("/api/auth/challenge", {});
  if (!ch.ok) return ch;
  onSolving?.(true);
  try {
    const { solvePowInBrowser } = await import("./pow");
    const solution = await solvePowInBrowser(ch.data.token, ch.data.difficultyBits);
    return await postJson<T>(url, { ...body, captcha: { token: ch.data.token, solution } });
  } catch {
    return { ok: false, code: "CHALLENGE_REQUIRED", status: 428 };
  } finally {
    onSolving?.(false);
  }
}

export async function fetchSession(): Promise<SessionDTO | null> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
    return res.ok ? ((await res.json()) as SessionDTO) : null;
  } catch {
    return null;
  }
}

/** API error code → key under messages "errors". Unknown codes fall back to "generic". */
const CODE_TO_KEY: Record<string, string> = {
  NETWORK: "network",
  INVALID_PHONE: "invalidPhone",
  RATE_LIMITED: "rateLimited",
  OTP_INVALID: "otpInvalid",
  OTP_EXPIRED: "otpExpired",
  OTP_LOCKED: "otpLocked",
  INVALID_CREDENTIALS: "invalidCredentials",
  ACCOUNT_BLOCKED: "accountBlocked",
  LOGIN_METHOD_DISABLED: "loginMethodDisabled",
  TWO_FACTOR_REQUIRED: "twoFactorRequired",
  TWO_FACTOR_UNAVAILABLE: "twoFactorUnavailable",
  NO_VENDOR_ACCESS: "noVendorAccess",
  CHALLENGE_REQUIRED: "challengeRequired",
  SESSION_REVOKED: "sessionRevoked",
  VALIDATION: "validation",
  FORBIDDEN: "forbidden",
  UNAUTHORIZED: "unauthorized",
};

export function errorMessageKey(code: string): string {
  return CODE_TO_KEY[code] ?? "generic";
}

/**
 * Only same-site relative paths are followed after login (open-redirect guard): "/x" yes,
 * "//evil.com", "https://…", "/\\evil" no. `allowedPrefixes` restricts staff logins to their area.
 */
export function safeNext(next: string | null | undefined, allowedPrefixes?: string[]): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(next)) return null;
  if (
    allowedPrefixes &&
    !allowedPrefixes.some((p) => next === p || next.startsWith(`${p}/`) || next.startsWith(`${p}?`))
  )
    return null;
  return next;
}
