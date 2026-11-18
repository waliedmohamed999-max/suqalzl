import { z } from "zod";

/**
 * Topic grammar (backend.md C1). Request topics use the opaque request UUID, not PR-number
 * (no enumeration even though subscription is authorized server-side).
 */
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const topicRe = new RegExp(
  `^(?:souq|pr:(${uuid}):customer|pr:(${uuid}):vendor:(${uuid})|vendor:(${uuid}):inbox|user:(${uuid}))$`,
);

export type Topic =
  | { kind: "souq" }
  | { kind: "prCustomer"; requestId: string }
  | { kind: "prVendor"; requestId: string; vendorId: string }
  | { kind: "vendorInbox"; vendorId: string }
  | { kind: "user"; userId: string };

export function parseTopic(raw: string): Topic | null {
  const m = topicRe.exec(raw);
  if (!m) return null;
  if (raw === "souq") return { kind: "souq" };
  if (m[1]) return { kind: "prCustomer", requestId: m[1] };
  if (m[2] && m[3]) return { kind: "prVendor", requestId: m[2], vendorId: m[3] };
  if (m[4]) return { kind: "vendorInbox", vendorId: m[4] };
  if (m[5]) return { kind: "user", userId: m[5] };
  return null;
}

export const topics = {
  souq: () => "souq",
  prCustomer: (requestId: string) => `pr:${requestId}:customer`,
  prVendor: (requestId: string, vendorId: string) => `pr:${requestId}:vendor:${vendorId}`,
  vendorInbox: (vendorId: string) => `vendor:${vendorId}:inbox`,
  user: (userId: string) => `user:${userId}`,
};

/**
 * Event payloads. PRIVATE channels carry ids + status + version only (no prices, no other vendor).
 * The PUBLIC `souq` channel may carry already-public deal data (left, status, endsAt).
 * Every payload is validated with a .strict() schema BEFORE it is written, so an extra key
 * (e.g. floorPrice) is a thrown error, not a leak.
 */
const id = z.uuid();
const version = z.number().int().nonnegative();
export const eventSchemas = {
  "request.created": z.object({ requestId: id, version }).strict(),
  "request.changed": z
    .object({ requestId: id, status: z.enum(["OPEN", "HAS_OFFERS", "ACCEPTED", "CONVERTED", "EXPIRED", "CANCELLED", "CLOSED"]), version })
    .strict(),
  "thread.changed": z.object({ requestId: id, threadId: id, version }).strict(),
  "deal.updated": z
    .object({ dealId: id, left: z.number().int().nonnegative(), status: z.enum(["LIVE", "ENDED"]), endsAt: z.iso.datetime(), version })
    .strict(),
  "notification.created": z.object({ id }).strict(),
} as const;

export type EventType = keyof typeof eventSchemas;
export type EventPayload<T extends EventType> = z.infer<(typeof eventSchemas)[T]>;

export interface RealtimeMessage {
  id: string; // bigint as string, used as SSE `id:` for Last-Event-ID
  topic: string;
  type: string;
  payload: unknown;
}
