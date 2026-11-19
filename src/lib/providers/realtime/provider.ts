import type { RealtimeMessage } from "./events";

/** SPEC §2: RealtimeProvider. Phase 1 = Postgres LISTEN/NOTIFY hub; later Centrifugo behind the same shape. */
export interface RealtimeProvider {
  /**
   * Live messages for the given (already authorized) topics. Returns unsubscribe.
   * onResync: the provider may have missed messages (reconnect) -> caller replays from its last id.
   */
  subscribe(topics: string[], onMessage: (m: RealtimeMessage) => void, onResync?: () => void): Promise<() => void>;
  /** Missed messages after lastEventId, for the given (already authorized) topics. */
  replay(topics: string[], afterId: bigint): Promise<RealtimeMessage[]>;
  /** Oldest retained id and last id handed out: a Last-Event-ID below the window gets `event: resync`. */
  bounds(): Promise<{ minId: bigint | null; headId: bigint }>;
  /** D36-1: cb fires once the session is revoked (internal control message after COMMIT). */
  onSessionRevoked(sessionId: string, cb: () => void): Promise<() => void>;
  stats(): { subscribers: number; topics: number; sessions: number; connected: boolean; reconnects: number };
}
