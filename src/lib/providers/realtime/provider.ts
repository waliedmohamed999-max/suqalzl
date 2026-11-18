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
  stats(): { subscribers: number; topics: number; connected: boolean; reconnects: number };
}
