import { z } from "zod";
import { isoDate, locale } from "@/features/common/schema";

/**
 * "بياناتي" + privacy (P2-04, SPEC §7.1 /account, PDPL). Signed-in customer only; userId from the
 * session (rule 8). Server Actions in features/account/actions.ts:
 *   getProfileAction()                          -> ActionResult<ProfileDTO>
 *   updateProfileAction(updateProfileInput)     -> ActionResult<ProfileDTO>   (name, locale)
 *   setMarketingConsentAction(marketingConsentInput) -> ActionResult<ProfileDTO>
 *       append-only MarketingConsent rows (version + source + ip), latest row per channel wins (D19)
 *   requestEmailChangeAction(requestEmailChangeInput) -> ActionResult<ProfileDTO>
 *       D36-6 (mandatory): the new address goes to `pendingEmail`; `email` changes ONLY after the
 *       link sent to the NEW address is opened (confirmEmailChangeAction). Same answer whether the
 *       address is free or taken (no oracle); a taken address simply never confirms (EMAIL_TAKEN at
 *       confirm time). Rate limited (RATE_LIMITED). Link valid 24 h, single use.
 *   cancelEmailChangeAction()                   -> ActionResult<ProfileDTO>
 *   confirmEmailChangeAction(confirmEmailChangeInput) -> ActionResult<ProfileDTO>  (TOKEN_INVALID)
 *       public page /account/email/confirm?token=…; must be signed in as the same user.
 *   exportMyDataAction()                        -> ActionResult<DataExportDTO>
 *       JSON download (PDPL right of access): profile, addresses, consents, orders (own lines,
 *       totals, statuses — no store finance), returns, reviews, wishlist. Rate limited.
 *   deleteAccountAction(deleteAccountInput)     -> ActionResult<null>
 *       M10: anonymisation, never a hard delete (orders/invoices keep their snapshots): name ->
 *       "عميل محذوف", phone/email/pendingEmail -> null, addresses + wishlist + cart + trusted
 *       devices deleted, consents withdrawn, reviews kept anonymous, deletedAt set, EVERY session
 *       revoked (SSE closed, D36-1). Refused with ACCOUNT_HAS_OPEN_ORDERS while an order is unpaid,
 *       in progress, or inside the return window; ACCOUNT_NOT_DELETABLE for staff/vendor accounts.
 *       The UI clears its state and goes home (the cookie is dead).
 */
export const CONSENT_CHANNELS = ["SMS", "WHATSAPP", "EMAIL"] as const;
export const consentChannel = z.enum(CONSENT_CHANNELS);

export const profileDTO = z
  .object({
    name: z.string(),
    /** the customer's own login phone (+9665…), unmasked: it is theirs */
    phone: z.string().nullable(),
    phoneVerified: z.boolean(),
    email: z.string().nullable(),
    emailVerified: z.boolean(),
    /** waiting for confirmation from the link sent to this address */
    pendingEmail: z.string().nullable(),
    locale,
    marketing: z.object({ SMS: z.boolean(), WHATSAPP: z.boolean(), EMAIL: z.boolean() }).strict(),
    createdAt: isoDate,
  })
  .strict();
export type ProfileDTO = z.infer<typeof profileDTO>;

export const updateProfileInput = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    locale: locale.optional(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.locale !== undefined, { path: ["name"] });

/** consent text version shown next to the switch (messages: account.consent.v1) */
export const CONSENT_VERSION = "2026-11-v1";
export const marketingConsentInput = z
  .object({
    channel: consentChannel,
    granted: z.boolean(),
    version: z.literal(CONSENT_VERSION).default(CONSENT_VERSION),
  })
  .strict();

export const requestEmailChangeInput = z
  .object({ email: z.email().trim().toLowerCase().max(254), locale: locale.default("ar") })
  .strict();
export const confirmEmailChangeInput = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/) }).strict();

/** The typed confirmation the deletion dialog asks for (Arabic or English word). */
export const DELETE_CONFIRM_WORDS = ["حذف", "DELETE"] as const;
export const deleteAccountInput = z
  .object({
    confirm: z.string().trim(),
    reason: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export const dataExportDTO = z
  .object({
    generatedAt: isoDate,
    format: z.literal("suqalzl-export-v1"),
    profile: profileDTO,
    addresses: z.array(z.record(z.string(), z.unknown())),
    consents: z.array(
      z.object({ channel: consentChannel, granted: z.boolean(), version: z.string(), at: isoDate }).strict(),
    ),
    orders: z.array(z.record(z.string(), z.unknown())),
    returns: z.array(z.record(z.string(), z.unknown())),
    reviews: z.array(z.record(z.string(), z.unknown())),
    wishlist: z.array(z.object({ productSlug: z.string(), addedAt: isoDate }).strict()),
  })
  .strict();
export type DataExportDTO = z.infer<typeof dataExportDTO>;
