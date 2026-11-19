import type { Tx } from "../../db";
import { eventSchemas, parseTopic, type EventPayload, type EventType } from "./events";

/**
 * Publish INSIDE the caller's business transaction (SPEC 6.8 realtime contract, P1-00).
 * Delivered to listeners only if that transaction commits (pg_notify is transactional) and persisted
 * in the outbox for Last-Event-ID replay. Payload goes through a .strict() schema: an extra key such
 * as floorPrice throws instead of leaking.
 */
export async function publish<T extends EventType>(tx: Tx, topic: string, type: T, payload: EventPayload<T>) {
  if (!parseTopic(topic)) throw new Error("invalid topic");
  const clean = eventSchemas[type].parse(payload);
  await tx.$queryRaw`SELECT app.publish_event(${topic}, ${type}, ${JSON.stringify(clean)}::jsonb)`;
}
