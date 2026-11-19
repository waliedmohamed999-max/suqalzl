/**
 * Auth API contracts (inputs .strict(): unknown keys are rejected). Shared with the frontend
 * (P1-02) and the mobile app. Error codes: see AuthErrorCode in src/lib/auth/service.ts and
 * messages/*.json "errors.*".
 */
import { z } from "zod";
import { NAME_MAX, sanitizeName } from "@/lib/text";

const locale = z.enum(["ar", "en"]).default("ar");
/** digits may be typed in Arabic-Indic; the server normalises them */
const otpCode = z.string().trim().min(1).max(12);
/** QA-B10: cleaned and length-limited on the server (raw input capped before cleaning). */
const personName = z
  .string()
  .max(NAME_MAX * 4)
  .transform(sanitizeName);
/** D36-2: answer to a CaptchaProvider challenge (POW: token from /api/auth/challenge + solution). */
export const captchaAnswer = z
  .object({ token: z.string().min(10).max(600), solution: z.string().min(1).max(32) })
  .strict();

export const otpRequestInput = z
  .object({ phone: z.string().min(9).max(20), locale, captcha: captchaAnswer.optional() })
  .strict();
export const otpVerifyInput = z
  .object({ phone: z.string().min(9).max(20), code: otpCode, name: personName.optional(), locale })
  .strict();
export const staffLoginInput = z
  .object({
    email: z.email().max(254),
    password: z.string().min(1).max(200),
    vendorId: z.uuid().optional(),
    captcha: captchaAnswer.optional(),
  })
  .strict();
export const staffOtpRequestInput = z
  .object({ phone: z.string().min(9).max(20), captcha: captchaAnswer.optional() })
  .strict();
export const staffOtpVerifyInput = z
  .object({ phone: z.string().min(9).max(20), code: otpCode, vendorId: z.uuid().optional() })
  .strict();
export const staffTwoFactorInput = z.object({ code: otpCode, rememberDevice: z.boolean().default(false) }).strict();

/** Responses */
export const sessionDTO = z
  .object({
    authenticated: z.boolean(),
    requires2fa: z.boolean(),
    area: z.enum(["account", "admin", "vendor"]).nullable(),
    user: z.object({ id: z.uuid(), role: z.string() }).strict().nullable(),
    vendorId: z.uuid().nullable(),
    vendorStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).nullable(),
    permissions: z.array(z.string()),
  })
  .strict();
export type SessionDTO = z.infer<typeof sessionDTO>;
