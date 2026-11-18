import type { Tx } from "../context";
import { eventSchemas, parseTopic, type EventPayload, type EventType } from "./events";

/**
 * Publish INSIDE the caller's business transaction. Delivered to listeners only if that
 * transaction commits (pg_notify is transactional) and persisted for Last-Event-ID replay.
 */
export async function publish<T extends EventType>(tx: Tx, topic: string, type: T, payload: EventPayload<T>) {
  if (!parseTopic(topic)) throw new Error("invalid topic");
  const clean = eventSchemas[type].parse(payload); // .strict(): unknown keys throw
  await tx.$queryRaw`SELECT app.publish_event(${topic}, ${type}, ${JSON.stringify(clean)}::jsonb)`;
}
