import { withCtx } from "../context";
import type { Session } from "../session";
import { parseTopic, type Topic } from "./events";

export type AuthResult = { ok: true; topics: string[] } | { ok: false; status: 400 | 401 | 403 };

const MAX_TOPICS = 10;

/**
 * Server-side subscription check (C1). All-or-nothing: one disallowed topic -> 403 for the whole
 * stream, with no body (no hint whether the request exists). Membership is re-checked on every
 * (re)connect; streams are closed after SSE_MAX_LIFETIME_MS so revocations take effect.
 */
export async function authorizeTopics(session: Session | null, raw: string[]): Promise<AuthResult> {
  const uniq = [...new Set(raw.map((t) => t.trim()).filter(Boolean))];
  if (uniq.length === 0 || uniq.length > MAX_TOPICS) return { ok: false, status: 400 };
  const parsed: Topic[] = [];
  for (const t of uniq) {
    const p = parseTopic(t);
    if (!p) return { ok: false, status: 400 };
    parsed.push(p);
  }
  const needsSession = parsed.some((p) => p.kind !== "souq");
  if (needsSession && !session) return { ok: false, status: 401 };

  for (const p of parsed) {
    switch (p.kind) {
      case "souq":
        break;
      case "user":
        if (p.userId !== session!.userId) return { ok: false, status: 403 };
        break;
      case "vendorInbox":
        if (session!.kind !== "vendor" || p.vendorId !== session!.vendorId) return { ok: false, status: 403 };
        break;
      case "prVendor": {
        const s = session!;
        if (s.kind !== "vendor" || p.vendorId !== s.vendorId) return { ok: false, status: 403 };
        const rec = await withCtx(s, (tx) =>
          tx.priceRequestRecipient.findFirst({ where: { requestId: p.requestId, vendorId: s.vendorId }, select: { id: true } }),
        );
        if (!rec) return { ok: false, status: 403 };
        break;
      }
      case "prCustomer": {
        const s = session!;
        if (s.kind !== "customer") return { ok: false, status: 403 };
        const r = await withCtx(s, (tx) =>
          tx.priceRequest.findFirst({ where: { id: p.requestId, customerId: s.userId }, select: { id: true } }),
        );
        if (!r) return { ok: false, status: 403 };
        break;
      }
    }
  }
  return { ok: true, topics: uniq };
}
