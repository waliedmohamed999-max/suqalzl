import pg from "pg";
import { getDb } from "../../db";
import type { RealtimeMessage } from "./events";
import type { RealtimeProvider } from "./provider";

type Listener = (m: RealtimeMessage) => void;
type Resync = () => void;

/**
 * Phase-1 RealtimeProvider (SPEC §2, ported from P1-00). One dedicated pg connection per Node process does `LISTEN realtime` and fans out in memory by topic.
 * (Not one LISTEN per topic: channel names are identifiers, and thousands of LISTENs on one
 * connection is wasteful.) Uses `pg` directly — Prisma has no LISTEN support. The connection must be
 * DIRECT, never through a transaction-mode pooler (REALTIME_DATABASE_URL).
 * Replay reads the outbox through app.read_events() (SECURITY DEFINER), never the table.
 */
export class PgListenHub implements RealtimeProvider {
  private client: pg.Client | null = null;
  private connecting: Promise<void> | null = null;
  private byTopic = new Map<string, Set<Listener>>();
  private subs = 0;
  private resyncs = new Set<Resync>();
  private everConnected = false;
  reconnects = 0;
  private closed = false;

  constructor(private readonly url: string) {}

  private async ensure(): Promise<void> {
    if (this.client) return;
    if (!this.connecting) {
      this.connecting = (async () => {
        const c = new pg.Client({ connectionString: this.url, keepAlive: true });
        c.on("notification", (n) => this.dispatch(n.payload));
        c.on("error", () => this.lost(c));
        c.on("end", () => this.lost(c));
        await c.connect();
        await c.query("LISTEN realtime");
        this.client = c;
        if (this.everConnected) {
          // Anything NOTIFYed while we were disconnected is in the outbox: tell streams to replay.
          this.reconnects++;
          for (const r of this.resyncs) r();
        }
        this.everConnected = true;
      })().finally(() => {
        this.connecting = null;
      });
    }
    return this.connecting;
  }

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  /** Connection lost (error/end fire both: handled once). Retry every 1s while anyone listens. */
  private lost(c?: pg.Client) {
    if (c && this.client && this.client !== c) return;
    this.client = null;
    if (this.closed || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.byTopic.size === 0) return;
      this.ensure().catch(() => this.lost());
    }, 1000);
  }

  private dispatch(raw: string | undefined) {
    if (!raw) return;
    let m: { id: number | string; topic: string; type: string; payload: unknown };
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const set = this.byTopic.get(m.topic);
    if (!set) return;
    const msg: RealtimeMessage = { id: String(m.id), topic: m.topic, type: m.type, payload: m.payload };
    for (const l of set) l(msg);
  }

  async subscribe(topics: string[], onMessage: Listener, onResync?: Resync) {
    await this.ensure();
    if (onResync) this.resyncs.add(onResync);
    for (const t of topics) {
      let set = this.byTopic.get(t);
      if (!set) this.byTopic.set(t, (set = new Set()));
      set.add(onMessage);
    }
    this.subs++;
    return () => {
      for (const t of topics) {
        const set = this.byTopic.get(t);
        set?.delete(onMessage);
        if (set && set.size === 0) this.byTopic.delete(t);
      }
      if (onResync) this.resyncs.delete(onResync);
      this.subs--;
    };
  }

  async replay(topics: string[], afterId: bigint): Promise<RealtimeMessage[]> {
    // read_events is SECURITY DEFINER: no RLS context needed; topics were authorized by the caller.
    return getDb().$queryRaw<RealtimeMessage[]>`
      SELECT id::text AS id, topic, type, payload FROM app.read_events(${topics}::text[], ${afterId}::bigint)`;
  }

  stats() {
    return { subscribers: this.subs, topics: this.byTopic.size, connected: !!this.client, reconnects: this.reconnects };
  }

  async close() {
    this.closed = true;
    await this.client?.end().catch(() => {});
  }
}

const g = globalThis as unknown as { __realtime?: PgListenHub };
export function realtime(): PgListenHub {
  const url = process.env.REALTIME_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return (g.__realtime ??= new PgListenHub(url));
}
