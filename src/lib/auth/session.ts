/**
 * Server-side sessions (SPEC §2 "جلسات من السيرفر"). The browser holds an opaque random token in an
 * httpOnly cookie; the database stores only its SHA-256. Every request re-validates the session
 * against the database (revocation, blocked user, vendor membership) — nothing is trusted from
 * the cookie itself. The mobile app sends the same token as `Authorization: Bearer`.
 */
import type { SessionScope } from "@/generated/prisma/enums";
import { withCtx, type Tx } from "../db";
import type { Principal } from "../permissions";
import { randomToken, sha256 } from "./crypto";

export const SESSION_TTL_SECONDS: Record<SessionScope, number> = {
  CUSTOMER: 30 * 24 * 3600,
  VENDOR: 7 * 24 * 3600,
  STAFF: 12 * 3600,
};
/** A pending-2FA session must be completed quickly. */
export const PENDING_2FA_TTL_SECONDS = 10 * 60;
const TOUCH_EVERY_MS = 5 * 60_000;

const isProd = () => process.env.NODE_ENV === "production";
/** `__Host-` prefix in production: Secure, Path=/, no Domain (cannot be set by a subdomain). */
export const sessionCookieName = () => (isProd() ? "__Host-szl_session" : "szl_session");
export const deviceCookieName = () => (isProd() ? "__Host-szl_device" : "szl_device");

export interface CookieSpec {
  name: string;
  value: string;
  options: { httpOnly: true; secure: boolean; sameSite: "lax"; path: "/"; maxAge: number };
}

export function sessionCookie(token: string, maxAgeSeconds: number): CookieSpec {
  return {
    name: sessionCookieName(),
    value: token,
    options: { httpOnly: true, secure: isProd(), sameSite: "lax", path: "/", maxAge: maxAgeSeconds },
  };
}
export function deviceCookie(token: string, maxAgeSeconds: number): CookieSpec {
  return { ...sessionCookie(token, maxAgeSeconds), name: deviceCookieName() };
}

export async function createSession(
  tx: Tx,
  input: {
    userId: string;
    scope: SessionScope;
    vendorId?: string | null;
    twoFactorPending?: boolean;
    ip?: string | null;
    userAgent?: string | null;
  },
): Promise<{ token: string; sessionId: string; expiresAt: Date; maxAgeSeconds: number }> {
  const token = randomToken();
  const maxAgeSeconds = input.twoFactorPending ? PENDING_2FA_TTL_SECONDS : SESSION_TTL_SECONDS[input.scope];
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const s = await tx.session.create({
    data: {
      tokenHash: sha256(token),
      userId: input.userId,
      scope: input.scope,
      vendorId: input.scope === "VENDOR" ? (input.vendorId ?? null) : null,
      twoFactorPending: input.twoFactorPending ?? false,
      ip: input.ip ?? null,
      userAgent: input.userAgent?.slice(0, 400) ?? null,
      expiresAt,
    },
    select: { id: true },
  });
  return { token, sessionId: s.id, expiresAt, maxAgeSeconds };
}

export interface SessionState {
  sessionId: string;
  userId: string;
  scope: SessionScope;
  twoFactorPending: boolean;
  principal: Principal | null;
}

/** Validates a raw token. Returns null for unknown/expired/revoked tokens or blocked/deleted users. */
export async function resolveSession(token: string | null | undefined): Promise<SessionState | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const tokenHash = sha256(token);
  return withCtx({ kind: "system", reason: "auth.resolve-session" }, async (tx) => {
    const s = await tx.session.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, role: true, status: true, deletedAt: true, permissions: true } } },
    });
    if (!s || s.revokedAt || s.expiresAt.getTime() <= Date.now()) return null;
    const u = s.user;
    if (u.status !== "ACTIVE" || u.deletedAt) return null;

    if (Date.now() - s.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
      await tx.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
    }
    const base = { sessionId: s.id, userId: u.id, scope: s.scope, twoFactorPending: s.twoFactorPending };
    if (s.twoFactorPending) return { ...base, principal: null };

    let principal: Principal | null = null;
    if (s.scope === "CUSTOMER") {
      principal = { kind: "customer", userId: u.id, role: u.role };
    } else if (s.scope === "STAFF") {
      if (u.role === "SUPER_ADMIN" || u.role === "STAFF") {
        principal = { kind: "staff", userId: u.id, role: u.role, permissions: u.permissions };
      }
    } else if (s.scope === "VENDOR" && s.vendorId) {
      principal = await vendorPrincipal(tx, u.id, u.role, s.vendorId);
    }
    return { ...base, principal };
  });
}

/** Re-checks ownership/membership on EVERY request: removing a team member takes effect at once. */
async function vendorPrincipal(tx: Tx, userId: string, role: string, vendorId: string): Promise<Principal | null> {
  const vendor = await tx.vendor.findUnique({ where: { id: vendorId }, select: { ownerUserId: true, status: true } });
  if (!vendor) return null;
  // Every status keeps a session; WHAT it may do is decided centrally by VENDOR_STATUS_ALLOWLIST
  // (D36-3: REJECTED can read the reason and resubmit, SUSPENDED fulfils existing orders).
  const vendorStatus = vendor.status;
  if (vendor.ownerUserId === userId) {
    return { kind: "vendor", userId, vendorId, role: "VENDOR_OWNER", permissions: [], vendorStatus };
  }
  const m = await tx.vendorMember.findUnique({ where: { vendorId_userId: { vendorId, userId } } });
  if (!m || !m.isActive) return null;
  void role;
  return { kind: "vendor", userId, vendorId, role: "VENDOR_STAFF", permissions: m.permissions, vendorStatus };
}

export async function revokeSession(token: string): Promise<void> {
  await withCtx({ kind: "system", reason: "auth.logout" }, (tx) =>
    tx.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } }),
  );
}

export function tokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return readCookie(req.headers.get("cookie"), sessionCookieName());
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export async function getPrincipalFromRequest(req: Request): Promise<Principal | null> {
  return (await resolveSession(tokenFromRequest(req)))?.principal ?? null;
}

/** Server Components / Server Actions: reads the cookie through next/headers. */
export async function getPrincipal(): Promise<Principal | null> {
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get(sessionCookieName())?.value;
  return (await resolveSession(token))?.principal ?? null;
}
