/**
 * Authentication flows (SPEC §2 Auth, §9, D20, D31).
 *
 * Customers: Saudi mobile (+9665 only) + self-generated OTP. First successful OTP creates the account.
 * Staff & vendors: e-mail + password (staffLoginMethod = PASSWORD, default) or phone OTP
 *   (staffLoginMethod = PHONE_OTP) — exactly ONE method is enabled at a time (D31, O14 pending).
 *   Optional 2FA (staffTwoFactorEnabled, default false): OTP to the registered phone + "remember this
 *   device for 30 days". staffLogin returns requires2fa.
 *
 * Rules: external calls (SMS) happen AFTER the transaction commits; responses never reveal whether an
 * account exists; every staff login and 2FA event is audited.
 */
import type { Role } from "@/generated/prisma/enums";
import { audit } from "../audit";
import { withCtx, type Ctx, type Tx } from "../db";
import { normalizeSaudiMobile } from "../phone";
import { captchaProvider, type CaptchaAnswer } from "../providers/captcha";
import { smsProvider } from "../providers/sms";
import { getSetting } from "../settings";
import { sanitizeName } from "../text";
import { randomToken, sha256 } from "./crypto";
import { issueOtp, verifyOtp } from "./otp";
import { verifyPassword } from "./password";
import { hitRateLimit, peekRateLimit, resetRateLimit } from "./rate-limit";
import { createSession, resolveSession, type CookieSpec, deviceCookie, sessionCookie } from "./session";

export type AuthErrorCode =
  | "INVALID_PHONE"
  | "RATE_LIMITED"
  | "CHALLENGE_REQUIRED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_LOCKED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_BLOCKED"
  | "LOGIN_METHOD_DISABLED"
  | "TWO_FACTOR_REQUIRED"
  | "TWO_FACTOR_UNAVAILABLE"
  | "NO_VENDOR_ACCESS";

const STATUS: Record<AuthErrorCode, number> = {
  INVALID_PHONE: 400,
  RATE_LIMITED: 429,
  /** D36-2: solve a CaptchaProvider challenge (POST /api/auth/challenge) and resend with `captcha` */
  CHALLENGE_REQUIRED: 428,
  OTP_INVALID: 400,
  OTP_EXPIRED: 400,
  OTP_LOCKED: 423,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_BLOCKED: 403,
  LOGIN_METHOD_DISABLED: 403,
  TWO_FACTOR_REQUIRED: 401,
  TWO_FACTOR_UNAVAILABLE: 409,
  NO_VENDOR_ACCESS: 403,
};

export class AuthError extends Error {
  readonly status: number;
  constructor(
    readonly code: AuthErrorCode,
    readonly retryAt?: Date,
  ) {
    super(code);
    this.status = STATUS[code];
  }
}

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

const SYS = (reason: string): Ctx => ({ kind: "system", reason });
const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "STAFF"];
const VENDOR_ROLES: Role[] = ["VENDOR_OWNER", "VENDOR_STAFF"];

function phoneOrThrow(raw: string): string {
  const phone = normalizeSaudiMobile(raw);
  if (!phone) throw new AuthError("INVALID_PHONE");
  return phone;
}

type OtpPurposeKey = "CUSTOMER_LOGIN" | "STAFF_LOGIN" | "STAFF_2FA";
type Gate = { ok: true } | { ok: false; error: "RATE_LIMITED" | "CHALLENGE_REQUIRED"; retryAt?: Date };

/**
 * Limits for SENDING an OTP (SPEC §9, D36-2, QA-B1/B2/B5). Order matters: the cheap per-IP refusals
 * first; the daily/global budgets are only spent by requests that will really send an SMS.
 *   1. phone + IP (strict, per hour)                 -> RATE_LIMITED for that IP only
 *   2. IP across phones (per hour)                   -> RATE_LIMITED
 *   3. phone alone (per hour, any IP)                -> CHALLENGE_REQUIRED unless `captcha` is valid
 *      (for STAFF_2FA there is no challenge step: the limit is hard, QA-B2)
 *   4. phone per day (absolute, cost)                -> RATE_LIMITED
 * IP-keyed steps are skipped when the IP is unknown (TRUSTED_PROXY_HOPS = 0, QA-B1).
 * The global SMS budget is spent separately by spendSmsBudget() right before issuing.
 */
async function otpRequestGate(
  tx: Tx,
  input: { phone: string; ip: string | null; purpose: OtpPurposeKey; captcha?: CaptchaAnswer | null },
): Promise<Gate> {
  const cfg = await getSetting(tx, "otp");
  const { phone, ip, purpose } = input;
  if (ip) {
    const strict = await hitRateLimit(tx, `otp:${purpose}:phone-ip:${phone}:${ip}`, cfg.perPhonePerHour, 3600);
    if (!strict.allowed) return { ok: false, error: "RATE_LIMITED", retryAt: strict.resetAt };
    const byIp = await hitRateLimit(tx, `otp:ip:${ip}`, cfg.perIpPerHour, 3600);
    if (!byIp.allowed) return { ok: false, error: "RATE_LIMITED", retryAt: byIp.resetAt };
  }
  const hourLimit = purpose === "STAFF_2FA" ? cfg.perPhonePerHour : cfg.challengeAfterPerPhonePerHour;
  const byPhone = await hitRateLimit(tx, `otp:${purpose}:phone:${phone}`, hourLimit, 3600);
  if (!byPhone.allowed) {
    if (purpose === "STAFF_2FA") return { ok: false, error: "RATE_LIMITED", retryAt: byPhone.resetAt };
    if (byPhone.count === hourLimit + 1) await securityAlert(tx, "security.otp_challenge_threshold", null, ip, purpose);
    if (!(await captchaProvider().verify(tx, input.captcha))) return { ok: false, error: "CHALLENGE_REQUIRED" };
  }
  const day = await hitRateLimit(tx, `otp:phone-day:${phone}`, cfg.perPhonePerDay, 24 * 3600);
  if (!day.allowed) return { ok: false, error: "RATE_LIMITED", retryAt: day.resetAt };
  return { ok: true };
}

/** QA-B1: platform-wide SMS budget per hour. Exceeding it is an incident: logged for alerting. */
async function spendSmsBudget(tx: Tx, audience: "customer" | "staff"): Promise<Gate> {
  const cfg = await getSetting(tx, "smsBudget");
  const limit = audience === "customer" ? cfg.customerPerHour : cfg.staffPerHour;
  const r = await hitRateLimit(tx, `sms:global:${audience}`, limit, 3600);
  if (r.allowed) return { ok: true };
  if (r.count === limit + 1) console.error(`[security] global SMS budget (${audience}) exhausted for this hour`);
  return { ok: false, error: "RATE_LIMITED", retryAt: r.resetAt };
}

/** D36-2 (و): crossing an identity-wide threshold is logged as a security alert (no phone/e-mail in it). */
async function securityAlert(tx: Tx, action: string, userId: string | null, ip: string | null, channel: string) {
  await audit(tx, SYS("auth.security-alert"), {
    action,
    entity: "User",
    entityId: userId,
    after: { channel },
    ip,
  });
}

// ============================================================================ customers

/** POST /api/auth/otp/request — same answer whether the phone has an account or not. */
export async function requestCustomerOtp(
  input: { phone: string; locale: "ar" | "en"; captcha?: CaptchaAnswer },
  meta: RequestMeta,
) {
  const phone = phoneOrThrow(input.phone);
  const issued = await withCtx(SYS("auth.customer-otp.request"), async (tx) => {
    const gate = await otpRequestGate(tx, { phone, ip: meta.ip, purpose: "CUSTOMER_LOGIN", captcha: input.captcha });
    if (!gate.ok) return gate;
    const budget = await spendSmsBudget(tx, "customer");
    if (!budget.ok) return budget;
    const cfg = await getSetting(tx, "otp");
    const user = await tx.user.findUnique({ where: { phone }, select: { id: true } });
    const otp = await issueOtp(tx, {
      phone,
      purpose: "CUSTOMER_LOGIN",
      userId: user?.id ?? null,
      ip: meta.ip,
      ttlSeconds: cfg.ttlSeconds,
      maxAttempts: cfg.maxAttempts,
    });
    return { ok: true as const, otp, ttlSeconds: cfg.ttlSeconds };
  });
  if (!issued.ok) throw new AuthError(issued.error, issued.retryAt);
  // After COMMIT (SPEC §9): never call a provider inside withCtx.
  await smsProvider().send({ to: phone, templateKey: "otp", vars: { code: issued.otp.code }, locale: input.locale });
  return { expiresInSeconds: issued.ttlSeconds };
}

/** POST /api/auth/otp/verify — creates the customer on first login (phone verified by the OTP). */
export async function verifyCustomerOtp(
  input: { phone: string; code: string; name?: string; locale: "ar" | "en" },
  meta: RequestMeta,
) {
  const phone = phoneOrThrow(input.phone);
  const r = await withCtx(SYS("auth.customer-otp.verify"), async (tx) => {
    const v = await verifyOtp(tx, { phone, purpose: "CUSTOMER_LOGIN", code: input.code });
    if (!v.ok) return { error: v.reason } as const;
    let user = await tx.user.findUnique({
      where: { phone },
      select: { id: true, status: true, deletedAt: true, name: true, role: true },
    });
    if (user && (user.status !== "ACTIVE" || user.deletedAt)) return { error: "ACCOUNT_BLOCKED" } as const;
    const isNew = !user;
    if (!user) {
      user = await tx.user.create({
        data: {
          phone,
          phoneVerifiedAt: new Date(),
          name: sanitizeName(input.name), // QA-B10 (the input schema cleans too: defence in depth)
          role: "CUSTOMER",
          locale: input.locale,
        },
        select: { id: true, status: true, deletedAt: true, name: true, role: true },
      });
    } else {
      await tx.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date(), lastLoginAt: new Date() } });
    }
    const s = await createSession(tx, { userId: user.id, scope: "CUSTOMER", ip: meta.ip, userAgent: meta.userAgent });
    return { user: { id: user.id, name: user.name, role: user.role }, isNew, session: s } as const;
  });
  if ("error" in r) throw new AuthError(r.error!);
  return {
    user: r.user,
    isNew: r.isNew,
    cookies: [sessionCookie(r.session.token, r.session.maxAgeSeconds)],
    /** for the mobile app (Bearer); web clients use the cookie */
    token: r.session.token,
  };
}

// ============================================================================ staff & vendors

interface StaffUser {
  id: string;
  role: Role;
  status: string;
  deletedAt: Date | null;
  phone: string | null;
}

async function resolveScope(tx: Tx, user: StaffUser, wantedVendorId?: string) {
  if (STAFF_ROLES.includes(user.role)) return { scope: "STAFF" as const, vendorId: null };
  if (!VENDOR_ROLES.includes(user.role)) return null;
  // All statuses can log in (D36-3: a REJECTED owner reads the reason and resubmits); permissions per
  // status are enforced by can()/requirePermission. Members of a non-approved store get nothing there.
  const owned = await tx.vendor.findMany({ where: { ownerUserId: user.id }, select: { id: true } });
  const member = await tx.vendorMember.findMany({
    where: { userId: user.id, isActive: true },
    select: { vendorId: true },
  });
  const ids = [...owned.map((v) => v.id), ...member.map((m) => m.vendorId)];
  const vendorId = wantedVendorId ? ids.find((i) => i === wantedVendorId) : ids[0];
  if (!vendorId) return null;
  return { scope: "VENDOR" as const, vendorId };
}

async function trustedDeviceValid(tx: Tx, userId: string, deviceToken: string | null | undefined) {
  if (!deviceToken) return false;
  const d = await tx.trustedDevice.findUnique({ where: { tokenHash: sha256(deviceToken) } });
  if (!d || d.userId !== userId || d.revokedAt || d.expiresAt.getTime() <= Date.now()) return false;
  await tx.trustedDevice.update({ where: { id: d.id }, data: { lastUsedAt: new Date() } });
  return true;
}

export interface StaffLoginResult {
  requires2fa: boolean;
  area: "admin" | "vendor";
  cookies: CookieSpec[];
  token: string;
}

/**
 * Finish a staff login once the first factor passed: open the session, or a 2FA-pending session and
 * send the code. Returns the SMS to send after commit.
 */
async function openStaffSession(
  tx: Tx,
  user: StaffUser,
  scope: { scope: "STAFF" | "VENDOR"; vendorId: string | null },
  meta: RequestMeta,
  opts: { deviceToken?: string | null; allow2fa: boolean },
) {
  const twoFactorOn = opts.allow2fa && (await getSetting(tx, "staffTwoFactorEnabled"));
  const trusted = twoFactorOn ? await trustedDeviceValid(tx, user.id, opts.deviceToken) : true;
  const needs2fa = twoFactorOn && !trusted;
  if (needs2fa && !user.phone) return { error: "TWO_FACTOR_UNAVAILABLE" as const };
  if (needs2fa) {
    // QA-B2: the 2FA SMS is under the same per-phone/IP/day limits and the staff SMS budget.
    const gate = await otpRequestGate(tx, { phone: user.phone!, ip: meta.ip, purpose: "STAFF_2FA" });
    if (!gate.ok) return { error: gate.error, retryAt: gate.retryAt };
    const budget = await spendSmsBudget(tx, "staff");
    if (!budget.ok) return { error: budget.error, retryAt: budget.retryAt };
  }
  const session = await createSession(tx, {
    userId: user.id,
    scope: scope.scope,
    vendorId: scope.vendorId,
    twoFactorPending: needs2fa,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  let sms: { to: string; code: string } | null = null;
  if (needs2fa) {
    const cfg = await getSetting(tx, "otp");
    const otp = await issueOtp(tx, {
      phone: user.phone!,
      purpose: "STAFF_2FA",
      userId: user.id,
      ip: meta.ip,
      ttlSeconds: cfg.ttlSeconds,
      maxAttempts: cfg.maxAttempts,
    });
    sms = { to: user.phone!, code: otp.code };
  } else {
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  }
  const ctx: Ctx = { kind: "system", reason: "auth.staff-login", userId: user.id };
  await audit(tx, ctx, {
    action: needs2fa ? "auth.staff_login.password_ok_2fa_pending" : "auth.staff_login",
    entity: "User",
    entityId: user.id,
    after: { scope: scope.scope, vendorId: scope.vendorId, trustedDevice: twoFactorOn && trusted },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { session, needs2fa, sms, area: scope.scope === "STAFF" ? ("admin" as const) : ("vendor" as const) };
}

async function finishStaffLogin(
  r: Awaited<ReturnType<typeof openStaffSession>> | { error: AuthErrorCode; retryAt?: Date },
): Promise<StaffLoginResult> {
  if ("error" in r) throw new AuthError(r.error!, "retryAt" in r ? r.retryAt : undefined);
  if (r.sms) await smsProvider().send({ to: r.sms.to, templateKey: "otp", vars: { code: r.sms.code }, locale: "ar" });
  return {
    requires2fa: r.needs2fa,
    area: r.area,
    cookies: [sessionCookie(r.session.token, r.session.maxAgeSeconds)],
    token: r.session.token,
  };
}

/**
 * POST /api/auth/staff/login (staffLoginMethod = PASSWORD). Anti lock-out (D36-2, QA-B5): only FAILED
 * attempts are counted, and nothing ever locks the account itself:
 *   (a) e-mail + IP, strict: refuses that IP for the window; reset by a success;
 *   (b) e-mail alone, higher: asks untrusted devices for a challenge (a valid trusted device of THIS
 *       user skips (b) but never (a)); crossing it is a security alert in audit_logs;
 *   (c) IP alone across e-mails (spraying).
 * The password is verified (dummy hash for unknown e-mails) before any decision: same answers and
 * timing for existing and unknown accounts.
 */
export async function staffPasswordLogin(
  input: { email: string; password: string; vendorId?: string; deviceToken?: string | null; captcha?: CaptchaAnswer },
  meta: RequestMeta,
): Promise<StaffLoginResult> {
  const email = input.email.trim().toLowerCase();
  const r = await withCtx(SYS("auth.staff-login.password"), async (tx) => {
    if ((await getSetting(tx, "staffLoginMethod")) !== "PASSWORD") return { error: "LOGIN_METHOD_DISABLED" as const };
    const cfg = await getSetting(tx, "staffLoginRateLimit");
    const strictKey = meta.ip ? `login-fail:email-ip:${email}:${meta.ip}` : null;
    const idKey = `login-fail:email:${email}`;
    const ipKey = meta.ip ? `login-fail:ip:${meta.ip}` : null;

    if (strictKey) {
      const strict = await peekRateLimit(tx, strictKey);
      if (strict.count >= cfg.max) return { error: "RATE_LIMITED" as const, retryAt: strict.resetAt ?? undefined };
    }
    if (ipKey) {
      const byIp = await peekRateLimit(tx, ipKey);
      if (byIp.count >= cfg.ipMax) return { error: "RATE_LIMITED" as const, retryAt: byIp.resetAt ?? undefined };
    }

    const user = await tx.user.findUnique({
      where: { email },
      select: { id: true, role: true, status: true, deletedAt: true, phone: true, passwordHash: true },
    });
    // verifyPassword runs even for unknown e-mails (dummy hash): no timing oracle.
    const ok = await verifyPassword(input.password, user?.passwordHash);

    if ((await peekRateLimit(tx, idKey)).count >= cfg.challengeAfter) {
      const trusted = user ? await trustedDeviceValid(tx, user.id, input.deviceToken) : false;
      if (!trusted && !(await captchaProvider().verify(tx, input.captcha)))
        return { error: "CHALLENGE_REQUIRED" as const };
    }

    if (!user || !ok) {
      if (strictKey) await hitRateLimit(tx, strictKey, cfg.max, cfg.windowMinutes * 60);
      if (ipKey) await hitRateLimit(tx, ipKey, cfg.ipMax, cfg.windowMinutes * 60);
      const id = await hitRateLimit(tx, idKey, cfg.challengeAfter, cfg.challengeWindowMinutes * 60);
      if (id.count === cfg.challengeAfter)
        await securityAlert(tx, "security.login_challenge_threshold", user?.id ?? null, meta.ip, "password");
      return { error: "INVALID_CREDENTIALS" as const };
    }
    if (strictKey) await resetRateLimit(tx, strictKey);
    if (user.status !== "ACTIVE" || user.deletedAt) return { error: "ACCOUNT_BLOCKED" as const };
    const scope = await resolveScope(tx, user, input.vendorId);
    if (!scope)
      return {
        error:
          STAFF_ROLES.includes(user.role) || VENDOR_ROLES.includes(user.role)
            ? ("NO_VENDOR_ACCESS" as const)
            : ("INVALID_CREDENTIALS" as const),
      };
    return openStaffSession(tx, user, scope, meta, { deviceToken: input.deviceToken, allow2fa: true });
  });
  return finishStaffLogin(r);
}

/** POST /api/auth/staff/otp/request (staffLoginMethod = PHONE_OTP). Silent for unknown phones. */
export async function requestStaffLoginOtp(input: { phone: string; captcha?: CaptchaAnswer }, meta: RequestMeta) {
  const phone = phoneOrThrow(input.phone);
  const r = await withCtx(SYS("auth.staff-otp.request"), async (tx) => {
    if ((await getSetting(tx, "staffLoginMethod")) !== "PHONE_OTP") return { error: "LOGIN_METHOD_DISABLED" as const };
    const gate = await otpRequestGate(tx, { phone, ip: meta.ip, purpose: "STAFF_LOGIN", captcha: input.captcha });
    if (!gate.ok) return { error: gate.error, retryAt: gate.retryAt };
    const cfg = await getSetting(tx, "otp");
    const user = await tx.user.findUnique({ where: { phone }, select: { id: true, role: true, status: true } });
    const eligible = user && user.status === "ACTIVE" && [...STAFF_ROLES, ...VENDOR_ROLES].includes(user.role);
    if (!eligible) return { sms: null, ttlSeconds: cfg.ttlSeconds };
    // budget only for SMS really sent (random unknown phones cannot drain the staff budget)
    // same silent answer as an unknown phone when the budget is exhausted (no account oracle)
    if (!(await spendSmsBudget(tx, "staff")).ok) return { sms: null, ttlSeconds: cfg.ttlSeconds };
    const otp = await issueOtp(tx, {
      phone,
      purpose: "STAFF_LOGIN",
      userId: user.id,
      ip: meta.ip,
      ttlSeconds: cfg.ttlSeconds,
      maxAttempts: cfg.maxAttempts,
    });
    return { sms: { to: phone, code: otp.code }, ttlSeconds: cfg.ttlSeconds };
  });
  if ("error" in r) throw new AuthError(r.error!, "retryAt" in r ? r.retryAt : undefined);
  if (r.sms) await smsProvider().send({ to: r.sms.to, templateKey: "otp", vars: { code: r.sms.code }, locale: "ar" });
  return { expiresInSeconds: r.ttlSeconds };
}

/** POST /api/auth/staff/otp/verify — phone OTP IS the factor; no extra 2FA step. */
export async function verifyStaffLoginOtp(
  input: { phone: string; code: string; vendorId?: string },
  meta: RequestMeta,
) {
  const phone = phoneOrThrow(input.phone);
  const r = await withCtx(SYS("auth.staff-otp.verify"), async (tx) => {
    if ((await getSetting(tx, "staffLoginMethod")) !== "PHONE_OTP") return { error: "LOGIN_METHOD_DISABLED" as const };
    const v = await verifyOtp(tx, { phone, purpose: "STAFF_LOGIN", code: input.code });
    if (!v.ok) return { error: v.reason };
    const user = await tx.user.findUnique({
      where: { phone },
      select: { id: true, role: true, status: true, deletedAt: true, phone: true },
    });
    if (!user) return { error: "OTP_INVALID" as const };
    if (user.status !== "ACTIVE" || user.deletedAt) return { error: "ACCOUNT_BLOCKED" as const };
    const scope = await resolveScope(tx, user, input.vendorId);
    if (!scope) return { error: "NO_VENDOR_ACCESS" as const };
    return openStaffSession(tx, user, scope, meta, { allow2fa: false });
  });
  return finishStaffLogin(r);
}

/** POST /api/auth/staff/2fa/verify — completes a 2FA-pending session (D31). */
export async function verifyStaffTwoFactor(
  input: { sessionToken: string | null; code: string; rememberDevice: boolean },
  meta: RequestMeta,
) {
  const state = await resolveSession(input.sessionToken);
  if (!state || !state.twoFactorPending) throw new AuthError("TWO_FACTOR_REQUIRED");
  const r = await withCtx(SYS("auth.staff-2fa.verify"), async (tx) => {
    const user = await tx.user.findUnique({ where: { id: state.userId }, select: { phone: true } });
    if (!user?.phone) return { error: "TWO_FACTOR_UNAVAILABLE" as const };
    const v = await verifyOtp(tx, { phone: user.phone, purpose: "STAFF_2FA", code: input.code });
    if (!v.ok) return { error: v.reason };
    // Rotate: drop the pending session, issue a full one (no session fixation across the 2FA step).
    await tx.session.update({ where: { id: state.sessionId }, data: { revokedAt: new Date() } });
    const old = await tx.session.findUniqueOrThrow({
      where: { id: state.sessionId },
      select: { scope: true, vendorId: true },
    });
    const session = await createSession(tx, {
      userId: state.userId,
      scope: old.scope,
      vendorId: old.vendorId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await tx.session.update({ where: { id: session.sessionId }, data: { twoFactorVerifiedAt: new Date() } });
    await tx.user.update({ where: { id: state.userId }, data: { lastLoginAt: new Date() } });
    const cookies: CookieSpec[] = [sessionCookie(session.token, session.maxAgeSeconds)];
    if (input.rememberDevice) {
      const days = await getSetting(tx, "trustedDeviceDays");
      const deviceToken = randomToken();
      await tx.trustedDevice.create({
        data: {
          userId: state.userId,
          tokenHash: sha256(deviceToken),
          userAgent: meta.userAgent?.slice(0, 400) ?? null,
          expiresAt: new Date(Date.now() + days * 24 * 3600_000),
        },
      });
      cookies.push(deviceCookie(deviceToken, days * 24 * 3600));
    }
    await audit(
      tx,
      { kind: "system", reason: "auth.staff-2fa", userId: state.userId },
      {
        action: "auth.staff_login.2fa_ok",
        entity: "User",
        entityId: state.userId,
        after: { rememberDevice: input.rememberDevice },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    );
    return { cookies, token: session.token, area: old.scope === "STAFF" ? ("admin" as const) : ("vendor" as const) };
  });
  if ("error" in r) throw new AuthError(r.error!);
  return r;
}
