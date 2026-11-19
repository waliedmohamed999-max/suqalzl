/**
 * RealtimeProvider entry point (SPEC §2 Realtime, 6.8 contract). Phase 1: SSE + LISTEN/NOTIFY with
 * the outbox (pg-hub). Later (load-dependent) Centrifugo behind the same interface.
 */
export type { RealtimeProvider } from "./provider";
export { realtime } from "./pg-hub";
export { publish } from "./publish";
export { topics, parseTopic, eventSchemas } from "./events";
export type { EventType, EventPayload, RealtimeMessage, Topic } from "./events";
export { authorizeTopics } from "./authorize";
