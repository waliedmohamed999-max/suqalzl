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
import { smsProvider } from "../providers/sms";
import { getSetting } from "../settings";
import { randomToken, sha256 } from "./crypto";
import { issueOtp, verifyOtp } from "./otp";
import { verifyPassword } from "./password";
import { hitRateLimit } from "./rate-limit";
import { createSession, resolveSession, type CookieSpec, deviceCookie, sessionCookie } from "./session";

export type AuthErrorCode =
  | "INVALID_PHONE"
  | "RATE_LIMITED"
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

async function otpRateLimits(tx: Tx, phone: string, ip: string | null, purpose: string) {
  const cfg = await getSetting(tx, "otp");
  const byPhone = await hitRateLimit(tx, `otp:${purpose}:phone:${phone}`, cfg.perPhonePerHour, 3600);
  const byIp = ip ? await hitRateLimit(tx, `otp:ip:${ip}`, cfg.perIpPerHour, 3600) : null;
  if (!byPhone.allowed) return { ok: false as const, retryAt: byPhone.resetAt, cfg };
  if (byIp && !byIp.allowed) return { ok: false as const, retryAt: byIp.resetAt, cfg };
  return { ok: true as const, cfg };
}

// ============================================================================ customers

/** POST /api/auth/otp/request — same answer whether the phone has an account or not. */
export async function requestCustomerOtp(input: { phone: string; locale: "ar" | "en" }, meta: RequestMeta) {
  const phone = phoneOrThrow(input.phone);
  const issued = await withCtx(SYS("auth.customer-otp.request"), async (tx) => {
    const rl = await otpRateLimits(tx, phone, meta.ip, "CUSTOMER_LOGIN");
    if (!rl.ok) return { limited: rl.retryAt } as const;
    const user = await tx.user.findUnique({ where: { phone }, select: { id: true } });
    const otp = await issueOtp(tx, {
      phone,
      purpose: "CUSTOMER_LOGIN",
      userId: user?.id ?? null,
      ip: meta.ip,
      ttlSeconds: rl.cfg.ttlSeconds,
      maxAttempts: rl.cfg.maxAttempts,
    });
    return { otp, ttlSeconds: rl.cfg.ttlSeconds } as const;
  });
  if ("limited" in issued) throw new AuthError("RATE_LIMITED", issued.limited);
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
          name: input.name?.trim().slice(0, 80) || "",
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
  const owned = await tx.vendor.findMany({
    where: { ownerUserId: user.id, status: { not: "REJECTED" } },
    select: { id: true },
  });
  const member = await tx.vendorMember.findMany({
    where: { userId: user.id, isActive: true, vendor: { status: { not: "REJECTED" } } },
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

/** POST /api/auth/staff/login (staffLoginMethod = PASSWORD). */
export async function staffPasswordLogin(
  input: { email: string; password: string; vendorId?: string; deviceToken?: string | null },
  meta: RequestMeta,
): Promise<StaffLoginResult> {
  const email = input.email.trim().toLowerCase();
  const r = await withCtx(SYS("auth.staff-login.password"), async (tx) => {
    if ((await getSetting(tx, "staffLoginMethod")) !== "PASSWORD") return { error: "LOGIN_METHOD_DISABLED" as const };
    const cfg = await getSetting(tx, "staffLoginRateLimit");
    const rl = await hitRateLimit(tx, `staff-login:${email}`, cfg.max, cfg.windowMinutes * 60);
    const rlIp = meta.ip
      ? await hitRateLimit(tx, `staff-login-ip:${meta.ip}`, cfg.max * 3, cfg.windowMinutes * 60)
      : null;
    if (!rl.allowed || (rlIp && !rlIp.allowed)) return { error: "RATE_LIMITED" as const, retryAt: rl.resetAt };

    const user = await tx.user.findUnique({
      where: { email },
      select: { id: true, role: true, status: true, deletedAt: true, phone: true, passwordHash: true },
    });
    // verifyPassword runs even for unknown e-mails (dummy hash): no timing oracle.
    const ok = await verifyPassword(input.password, user?.passwordHash);
    if (!user || !ok) return { error: "INVALID_CREDENTIALS" as const };
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
export async function requestStaffLoginOtp(input: { phone: string }, meta: RequestMeta) {
  const phone = phoneOrThrow(input.phone);
  const r = await withCtx(SYS("auth.staff-otp.request"), async (tx) => {
    if ((await getSetting(tx, "staffLoginMethod")) !== "PHONE_OTP") return { error: "LOGIN_METHOD_DISABLED" as const };
    const rl = await otpRateLimits(tx, phone, meta.ip, "STAFF_LOGIN");
    if (!rl.ok) return { error: "RATE_LIMITED" as const, retryAt: rl.retryAt };
    const user = await tx.user.findUnique({ where: { phone }, select: { id: true, role: true, status: true } });
    const eligible = user && user.status === "ACTIVE" && [...STAFF_ROLES, ...VENDOR_ROLES].includes(user.role);
    if (!eligible) return { sms: null, ttlSeconds: rl.cfg.ttlSeconds };
    const otp = await issueOtp(tx, {
      phone,
      purpose: "STAFF_LOGIN",
      userId: user.id,
      ip: meta.ip,
      ttlSeconds: rl.cfg.ttlSeconds,
      maxAttempts: rl.cfg.maxAttempts,
    });
    return { sms: { to: phone, code: otp.code }, ttlSeconds: rl.cfg.ttlSeconds };
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
