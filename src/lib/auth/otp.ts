/**
 * Self-generated OTP (D20, SPEC §9): 6 digits from crypto.randomInt, only an HMAC is stored
 * (OTP_HMAC_SECRET; a bare hash of 10^6 codes is brute-forced instantly if the DB leaks),
 * 5-minute expiry, 5 attempts then locked. A new code supersedes the previous open one.
 * Verification RETURNS a result instead of throwing so the attempt counter is committed.
 */
import { randomInt, randomUUID } from "node:crypto";
import type { OtpPurpose } from "@/generated/prisma/enums";
import type { Tx } from "../db";
import { env } from "../env";
import { toLatinDigits } from "../format/digits";
import { hmacSha256, safeEqual } from "./crypto";

export const OTP_LENGTH = 6;

export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

function otpHash(challengeId: string, phone: string, purpose: OtpPurpose, code: string): string {
  return hmacSha256(env().OTP_HMAC_SECRET, `${purpose}:${phone}:${challengeId}:${code}`);
}

export async function issueOtp(
  tx: Tx,
  input: { phone: string; purpose: OtpPurpose; userId?: string | null; ip?: string | null; ttlSeconds: number; maxAttempts: number },
): Promise<{ code: string; challengeId: string; expiresAt: Date }> {
  await tx.otpChallenge.updateMany({
    where: { phone: input.phone, purpose: input.purpose, consumedAt: null, lockedAt: null },
    data: { consumedAt: new Date() }, // superseded
  });
  const id = randomUUID();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
  await tx.otpChallenge.create({
    data: {
      id,
      phone: input.phone,
      purpose: input.purpose,
      userId: input.userId ?? null,
      codeHash: otpHash(id, input.phone, input.purpose, code),
      maxAttempts: input.maxAttempts,
      expiresAt,
      ip: input.ip ?? null,
    },
  });
  return { code, challengeId: id, expiresAt };
}

export type OtpVerifyResult =
  | { ok: true; challengeId: string; userId: string | null }
  | { ok: false; reason: "OTP_INVALID" | "OTP_EXPIRED" | "OTP_LOCKED" };

export async function verifyOtp(tx: Tx, input: { phone: string; purpose: OtpPurpose; code: string }): Promise<OtpVerifyResult> {
  const rows = await tx.$queryRaw<
    { id: string; code_hash: string; attempts: number; max_attempts: number; expires_at: Date; locked_at: Date | null; user_id: string | null }[]
  >`
    SELECT id, code_hash, attempts, max_attempts, expires_at, locked_at, user_id
      FROM otp_challenges
     WHERE phone = ${input.phone} AND purpose = ${input.purpose}::"OtpPurpose" AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1
       FOR UPDATE`;
  const ch = rows[0];
  if (!ch) return { ok: false, reason: "OTP_EXPIRED" };
  if (ch.locked_at) return { ok: false, reason: "OTP_LOCKED" };
  if (ch.expires_at.getTime() <= Date.now()) return { ok: false, reason: "OTP_EXPIRED" };

  const code = toLatinDigits(input.code).replace(/\s/g, "");
  const matches = /^\d{6}$/.test(code) && safeEqual(otpHash(ch.id, input.phone, input.purpose, code), ch.code_hash);
  if (matches) {
    await tx.otpChallenge.update({ where: { id: ch.id }, data: { consumedAt: new Date() } });
    return { ok: true, challengeId: ch.id, userId: ch.user_id };
  }
  const attempts = ch.attempts + 1;
  const lock = attempts >= ch.max_attempts;
  await tx.otpChallenge.update({ where: { id: ch.id }, data: { attempts, lockedAt: lock ? new Date() : null } });
  return { ok: false, reason: lock ? "OTP_LOCKED" : "OTP_INVALID" };
}
