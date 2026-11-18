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
      createRateLimit: z.object({ max: z.number().int().positive(), windowMinutes: z.number().int().positive() }).strict(),
      autoAcceptDelayMinutes: z.object({ min: z.number().int().nonnegative(), max: z.number().int().positive() }).strict(),
      requestExpiryHours: z.number().int().positive(),
      priceLockHours: z.number().int().positive(),
      defaultMaxRounds: z.number().int().positive(),
      defaultResponseWindowHours: z.number().int().positive(),
    })
    .strict(),
  /** D31 / O14 — PENDING_OWNER */
  staffLoginMethod: z.enum(["PASSWORD", "PHONE_OTP"]),
  staffTwoFactorEnabled: z.boolean(),
  /** SPEC §9: OTP 6 digits, 5 minutes, 5 attempts; rate limit 5/hour per phone and per IP */
  otp: z
    .object({
      ttlSeconds: z.number().int().positive(),
      maxAttempts: z.number().int().positive(),
      perPhonePerHour: z.number().int().positive(),
      perIpPerHour: z.number().int().positive(),
    })
    .strict(),
  staffLoginRateLimit: z.object({ max: z.number().int().positive(), windowMinutes: z.number().int().positive() }).strict(),
  trustedDeviceDays: z.number().int().positive(),
  checkoutReservationMinutes: z.number().int().positive(),
  flashPriceLockMinutes: z.number().int().positive(),
  whatsappNumber: z.string().nullable(),
  pixels: z
    .object({ ga4: z.string().nullable(), meta: z.string().nullable(), snap: z.string().nullable(), tiktok: z.string().nullable() })
    .strict(),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export const DEFAULT_SETTINGS: { [K in SettingKey]: SettingValue<K> } = {
  storeInfo: { nameAr: "سوق الزل", nameEn: "Souq AlZal", crNumber: null, vatNumber: null, addressAr: null, supportEmail: null },
  vatRate: 1500,
  defaultCommission: 1000,
  commissionBase: "NET_OF_VAT",
  holdDays: 7,
  newVendorHoldDays: 14,
  payoutCycle: "WEEKLY",
  payoutWeekday: "SUN",
  minPayout: 10_000,
  payoutManualReviewOver: 1_000_000,
  gatewayFeeBearer: { MADA: "PLATFORM", CARD: "PLATFORM", APPLE_PAY: "PLATFORM", STC_PAY: "PLATFORM", TABBY: "VENDOR", TAMARA: "VENDOR" },
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
  otp: { ttlSeconds: 300, maxAttempts: 5, perPhonePerHour: 5, perIpPerHour: 5 },
  staffLoginRateLimit: { max: 10, windowMinutes: 15 },
  trustedDeviceDays: 30,
  checkoutReservationMinutes: 30,
  flashPriceLockMinutes: 15,
  whatsappNumber: null,
  pixels: { ga4: null, meta: null, snap: null, tiktok: null },
};

/** Keys the public storefront may read (Setting.isPublic). */
export const PUBLIC_SETTING_KEYS: readonly SettingKey[] = ["storeInfo", "whatsappNumber", "pixels", "souqDiscountsRequireLicense"];

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
];

/**
 * Read one setting inside the caller's transaction. Invalid or missing rows fall back to the
 * default (and never throw at runtime), so a bad admin edit cannot take the store down.
 */
export async function getSetting<K extends SettingKey>(tx: Tx, key: K): Promise<SettingValue<K>> {
  const row = await tx.setting.findUnique({ where: { key } });
  if (!row) return DEFAULT_SETTINGS[key];
  const parsed = settingSchemas[key].safeParse(row.value);
  return parsed.success ? (parsed.data as SettingValue<K>) : DEFAULT_SETTINGS[key];
}
