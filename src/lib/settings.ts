/**
 * Business settings (SPEC §5 `Setting`, D22, D27, D31). Single source of the DEFAULT values: the seed
 * writes them, and code falls back to them if a row is missing. Values awaiting the owner are marked
 * PENDING_OWNER and are the finance-zatca proposals (docs/decisions/finance.md) — changeable from
 * /admin/settings without code changes (D27).
 * Money = halalas, rates = basis points.
 */
import { z } from "zod";
import type { Tx } from "./db";

const bps = z.number().int().min(0).max(10_000);
const halalas = z.number().int().nonnegative();
const bearer = z.enum(["PLATFORM", "VENDOR"]);

export const settingSchemas = {
  storeInfo: z
    .object({
      nameAr: z.string(),
      nameEn: z.string(),
      /** filled in P8 (D15): CR, VAT number, national address */
      crNumber: z.string().nullable(),
      vatNumber: z.string().nullable(),
      addressAr: z.string().nullable(),
      supportEmail: z.string().nullable(),
    })
    .strict(),
  vatRate: bps,
  defaultCommission: bps,
  commissionBase: z.literal("NET_OF_VAT"),
  /** O3 — PENDING_OWNER */
  holdDays: z.number().int().min(0).max(90),
  newVendorHoldDays: z.number().int().min(0).max(90),
  payoutCycle: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  payoutWeekday: z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]),
  minPayout: halalas,
  payoutManualReviewOver: halalas,
  /** O1 — PENDING_OWNER: map per payment method, frozen on SubOrder.feeBearer at payment time */
  gatewayFeeBearer: z
    .object({ MADA: bearer, CARD: bearer, APPLE_PAY: bearer, STC_PAY: bearer, TABBY: bearer, TAMARA: bearer })
    .strict(),
  /** O7 — PENDING_OWNER: null = same chain as regular sales */
  negotiationCommissionBps: bps.nullable(),
  /** D18 */
  platformCouponApprovalBps: bps,
  /** D16 */
  souqDiscountsRequireLicense: z.boolean(),
  /** O10 — PENDING_OWNER */
  allowNonResidentVendors: z.boolean(),
  /** D26 / O11 */
  swordsVendorsAllowed: z.boolean(),
  /** D22 negotiation limits */
  negotiation: z
    .object({
      requirePhoneVerified: z.boolean(),
      maxOpenPerCustomer: z.number().int().positive(),
      maxPerDay: z.number().int().positive(),
      newAccountMaxOpen: z.number().int().positive(),
      newAccountMaxPerDay: z.number().int().positive(),
      newAccountDays: z.number().int().positive(),
      oneOpenPerProduct: z.boolean(),
      minTargetPctOfVariantBps: bps,
      minTargetPctOfCategoryMinBps: bps,
      maxRecipients: z.number().int().positive(),
      contactStrikesToSuspend: z.number().int().positive(),
      contactStrikeWindowDays: z.number().int().positive(),
      suspensionDays: z.number().int().positive(),
      createRateLimit: z
        .object({ max: z.number().int().positive(), windowMinutes: z.number().int().positive() })
        .strict(),
      autoAcceptDelayMinutes: z
        .object({ min: z.number().int().nonnegative(), max: z.number().int().positive() })
        .strict(),
      requestExpiryHours: z.number().int().positive(),
      priceLockHours: z.number().int().positive(),
      defaultMaxRounds: z.number().int().positive(),
      defaultResponseWindowHours: z.number().int().positive(),
    })
    .strict(),
  /** D31 / O14 — PENDING_OWNER */
  staffLoginMethod: z.enum(["PASSWORD", "PHONE_OTP"]),
  staffTwoFactorEnabled: z.boolean(),
  /**
   * SPEC §9: OTP 6 digits, 5 minutes, 5 attempts. Request limits (D36-2 / QA-B5):
   * - perPhonePerHour: STRICT counter keyed by phone + IP (refuses that IP only);
   * - perIpPerHour: per IP across all phones;
   * - challengeAfterPerPhonePerHour: phone alone (any IP); beyond it the request needs a
   *   CaptchaProvider challenge — it never locks the phone;
   * - perPhonePerDay: absolute daily cap per phone (SMS cost protection).
   */
  otp: z
    .object({
      ttlSeconds: z.number().int().positive(),
      maxAttempts: z.number().int().positive(),
      perPhonePerHour: z.number().int().positive(),
      perIpPerHour: z.number().int().positive(),
      challengeAfterPerPhonePerHour: z.number().int().positive().default(10),
      perPhonePerDay: z.number().int().positive().default(20),
    })
    .strict(),
  /** QA-B1: platform-wide SMS budget per hour (cost protection). Staff has its own bucket so a
   * customer-OTP flood cannot lock the admins out. */
  smsBudget: z
    .object({ customerPerHour: z.number().int().positive(), staffPerHour: z.number().int().positive() })
    .strict(),
  /**
   * Staff password login (D36-2 / QA-B5). Only FAILED attempts are counted:
   * - max / windowMinutes: STRICT, keyed by e-mail + IP, reset on success;
   * - challengeAfter / challengeWindowMinutes: e-mail alone; beyond it untrusted devices must solve a
   *   challenge (never a lock-out); a valid trusted device (D31) skips this one only;
   * - ipMax: failures per IP across all e-mails (password spraying).
   */
  staffLoginRateLimit: z
    .object({
      max: z.number().int().positive(),
      windowMinutes: z.number().int().positive(),
      challengeAfter: z.number().int().positive().default(20),
      challengeWindowMinutes: z.number().int().positive().default(60),
      ipMax: z.number().int().positive().default(50),
    })
    .strict(),
  /** D36-2 / O15 (PENDING_OWNER): external CAPTCHA awaits the owner; POW = self-hosted proof-of-work. */
  captcha: z
    .object({
      provider: z.enum(["POW"]),
      powDifficultyBits: z.number().int().min(8).max(28),
      ttlSeconds: z.number().int().positive(),
    })
    .strict(),
  trustedDeviceDays: z.number().int().positive(),
  checkoutReservationMinutes: z.number().int().positive(),
  flashPriceLockMinutes: z.number().int().positive(),
  whatsappNumber: z.string().nullable(),
  pixels: z
    .object({
      ga4: z.string().nullable(),
      meta: z.string().nullable(),
      snap: z.string().nullable(),
      tiktok: z.string().nullable(),
    })
    .strict(),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export const DEFAULT_SETTINGS: { [K in SettingKey]: SettingValue<K> } = {
  storeInfo: {
    nameAr: "سوق الزل",
    nameEn: "Souq AlZal",
    crNumber: null,
    vatNumber: null,
    addressAr: null,
    supportEmail: null,
  },
  vatRate: 1500,
  defaultCommission: 1000,
  commissionBase: "NET_OF_VAT",
  holdDays: 7,
  newVendorHoldDays: 14,
  payoutCycle: "WEEKLY",
  payoutWeekday: "SUN",
  minPayout: 10_000,
  payoutManualReviewOver: 1_000_000,
  gatewayFeeBearer: {
    MADA: "PLATFORM",
    CARD: "PLATFORM",
    APPLE_PAY: "PLATFORM",
    STC_PAY: "PLATFORM",
    TABBY: "VENDOR",
    TAMARA: "VENDOR",
  },
  negotiationCommissionBps: null,
  platformCouponApprovalBps: 1000,
  souqDiscountsRequireLicense: false,
  allowNonResidentVendors: false,
  swordsVendorsAllowed: false,
  negotiation: {
    requirePhoneVerified: true,
    maxOpenPerCustomer: 5,
    maxPerDay: 10,
    newAccountMaxOpen: 2,
    newAccountMaxPerDay: 3,
    newAccountDays: 7,
    oneOpenPerProduct: true,
    minTargetPctOfVariantBps: 5000,
    minTargetPctOfCategoryMinBps: 3000,
    maxRecipients: 30,
    contactStrikesToSuspend: 3,
    contactStrikeWindowDays: 7,
    suspensionDays: 7,
    createRateLimit: { max: 5, windowMinutes: 10 },
    autoAcceptDelayMinutes: { min: 2, max: 10 },
    requestExpiryHours: 48,
    priceLockHours: 24,
    defaultMaxRounds: 3,
    defaultResponseWindowHours: 24,
  },
  staffLoginMethod: "PASSWORD",
  staffTwoFactorEnabled: false,
  otp: {
    ttlSeconds: 300,
    maxAttempts: 5,
    perPhonePerHour: 5,
    perIpPerHour: 5,
    challengeAfterPerPhonePerHour: 10,
    perPhonePerDay: 20,
  },
  smsBudget: { customerPerHour: 300, staffPerHour: 60 },
  staffLoginRateLimit: { max: 5, windowMinutes: 15, challengeAfter: 20, challengeWindowMinutes: 60, ipMax: 50 },
  captcha: { provider: "POW", powDifficultyBits: 16, ttlSeconds: 300 },
  trustedDeviceDays: 30,
  checkoutReservationMinutes: 30,
  flashPriceLockMinutes: 15,
  whatsappNumber: null,
  pixels: { ga4: null, meta: null, snap: null, tiktok: null },
};

/** Keys the public storefront may read (Setting.isPublic). */
export const PUBLIC_SETTING_KEYS: readonly SettingKey[] = [
  "storeInfo",
  "whatsappNumber",
  "pixels",
  "souqDiscountsRequireLicense",
];

/** Values that are defaults awaiting an owner decision (docs/decisions.md §8, SPEC table O). */
export const PENDING_OWNER_KEYS: readonly SettingKey[] = [
  "holdDays",
  "newVendorHoldDays",
  "payoutCycle",
  "payoutWeekday",
  "minPayout",
  "gatewayFeeBearer",
  "negotiationCommissionBps",
  "allowNonResidentVendors",
  "swordsVendorsAllowed",
  "staffLoginMethod",
  "staffTwoFactorEnabled",
  "captcha",
];

/**
 * Security settings fail CLOSED (QA-B6): an invalid stored value must never silently weaken
 * authentication. For these keys an unparseable row uses the value below (not the default) and logs an
 * error (Sentry picks up console.error). A MISSING row is not an error: it means "default".
 */
export const SECURITY_FAIL_CLOSED: { [K in SettingKey]?: SettingValue<K> } = {
  // 2FA ON when the flag is corrupt: staff without a phone get TWO_FACTOR_UNAVAILABLE (fix the row).
  staffTwoFactorEnabled: true,
  // the decided method (D31); PHONE_OTP is never assumed from a corrupt value
  staffLoginMethod: "PASSWORD",
  otp: { ...DEFAULT_SETTINGS.otp },
  smsBudget: { ...DEFAULT_SETTINGS.smsBudget },
  staffLoginRateLimit: { ...DEFAULT_SETTINGS.staffLoginRateLimit },
  // shortest allowed "remember this device"
  trustedDeviceDays: 1,
  captcha: { ...DEFAULT_SETTINGS.captcha },
};

/**
 * Read one setting inside the caller's transaction.
 * - missing row  -> default;
 * - invalid row  -> security keys: SECURITY_FAIL_CLOSED + console.error; business keys: default
 *   (a bad admin edit cannot take the store down) + console.error.
 */
export async function getSetting<K extends SettingKey>(tx: Tx, key: K): Promise<SettingValue<K>> {
  const row = await tx.setting.findUnique({ where: { key } });
  if (!row) return DEFAULT_SETTINGS[key];
  const parsed = settingSchemas[key].safeParse(row.value);
  if (parsed.success) return parsed.data as SettingValue<K>;
  const closed = SECURITY_FAIL_CLOSED[key];
  // key name and issue codes only, never the value (could be anything an admin typed)
  console.error(
    `[settings] invalid value for "${key}" (${parsed.error.issues.map((i) => i.code).join(",")}); using ${
      closed !== undefined ? "FAIL-CLOSED value" : "default"
    }`,
  );
  return (closed !== undefined ? closed : DEFAULT_SETTINGS[key]) as SettingValue<K>;
}
