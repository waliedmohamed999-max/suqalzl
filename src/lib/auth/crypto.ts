import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** 256-bit random token, base64url (session cookies, trusted devices). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Constant-time string comparison (webhook secrets, cron secret, hashes). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // still spend comparable time
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
