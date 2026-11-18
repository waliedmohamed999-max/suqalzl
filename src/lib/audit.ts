/**
 * Audit log helper (SPEC §4: every sensitive operation — order status change, vendor approval,
 * commission edit, payout recording, staff login, settings change — is written to audit_logs).
 * audit_logs is append-only (trigger, M11). Write it in the SAME transaction as the change, so the
 * log exists if and only if the change committed.
 * Never put secrets or unnecessary personal data in before/after (PDPL): use redactForAudit().
 */
import type { Prisma } from "@/generated/prisma/client";
import type { Ctx, Tx } from "./db";

export interface AuditEntry {
  action: string; // dotted verb, e.g. "vendor.approve", "order.transition", "auth.staff_login"
  entity: string; // table/aggregate, e.g. "Vendor"
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

const SECRET_KEYS =
  /^(password|passwordHash|password_hash|iban|token|tokenHash|codeHash|floorPrice|autoAcceptPrice|secret)$/i;

/** Recursively replace secret-looking keys with "[REDACTED]". */
export function redactForAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForAudit);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEYS.test(k) ? "[REDACTED]" : redactForAudit(v);
    return out;
  }
  return value;
}

function toJson(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined) return undefined;
  return JSON.parse(JSON.stringify(redactForAudit(v), (_k, x) => (typeof x === "bigint" ? x.toString() : x)));
}

export async function audit(tx: Tx, ctx: Ctx, entry: AuditEntry): Promise<void> {
  const actorUserId = "userId" in ctx && ctx.userId ? ctx.userId : null;
  await tx.auditLog.create({
    data: {
      actorUserId,
      actorRole: ctx.kind,
      vendorId: ctx.kind === "vendor" ? ctx.vendorId : null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: toJson(entry.before),
      after: toJson(entry.after),
      ip: entry.ip ?? null,
      userAgent: entry.userAgent?.slice(0, 400) ?? null,
      requestId: entry.requestId ?? null,
    },
  });
}
