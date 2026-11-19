import pg from "pg";
import { getDb } from "../../db";
import type { RealtimeMessage } from "./events";
import type { RealtimeProvider } from "./provider";

type Listener = (m: RealtimeMessage) => void;
type Resync = () => void;
type Revoked = () => void;

/** Internal control channel (D36-1): never forwarded to clients, ids only. */
export const CONTROL_CHANNEL = "realtime_ctl";
/** pg_stat_activity.application_name of the LISTEN connection (ops: count/kill it, alerts). */
export const LISTEN_APPLICATION_NAME = "suqalzl-realtime-listen";
/** read_events() hard cap; a replay that hits it cannot be complete -> `event: resync`. */
export const REPLAY_LIMIT = 1000;

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
  private bySession = new Map<string, Set<Revoked>>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly url: string,
    private readonly opts: { pingMs?: number; pingTimeoutMs?: number } = {},
  ) {}

  private async ensure(): Promise<void> {
    if (this.client) return;
    if (!this.connecting) {
      this.connecting = (async () => {
        // T10 condition 2 (devops review): detect a dead LISTEN connection in <= 60 s. TCP keepalive
        // after 30 s idle (instead of the OS default ~2 h) AND an application ping every 30 s, which
        // also catches proxies/NAT that answer keepalives but dropped the session.
        const c = new pg.Client({
          connectionString: this.url,
          keepAlive: true,
          keepAliveInitialDelayMillis: 30_000,
          application_name: LISTEN_APPLICATION_NAME,
        });
        c.on("notification", (n) =>
          n.channel === CONTROL_CHANNEL ? this.dispatchControl(n.payload) : this.dispatch(n.payload),
        );
        c.on("error", () => this.lost(c));
        c.on("end", () => this.lost(c));
        await c.connect();
        await c.query("LISTEN realtime");
        await c.query(`LISTEN ${CONTROL_CHANNEL}`);
        this.client = c;
        this.startPing(c);
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

  private startPing(c: pg.Client) {
    this.stopPing();
    const every = this.opts.pingMs ?? Number(process.env.REALTIME_PING_SECONDS ?? 30) * 1000;
    const timeout = this.opts.pingTimeoutMs ?? 10_000;
    this.pingTimer = setInterval(() => {
      if (this.client !== c) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      Promise.race([
        c.query("SELECT 1"),
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("ping timeout")), timeout))),
      ])
        .catch(() => {
          // half-open socket: force it closed so the normal reconnect + replay path runs
          this.lost(c);
          c.end().catch(() => {});
        })
        .finally(() => clearTimeout(timer));
    }, every);
    this.pingTimer.unref?.();
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  /** Connection lost (error/end fire both: handled once). Retry every 1s while anyone listens. */
  private lost(c?: pg.Client) {
    if (c && this.client && this.client !== c) return;
    if (!this.client && c && this.retryTimer) return;
    this.client = null;
    this.stopPing();
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

  /** session.revoked {sessionId, userId} from the sessions trigger (0011). Payload never leaves the hub. */
  private dispatchControl(raw: string | undefined) {
    if (!raw) return;
    let m: { type?: string; sessionId?: string };
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.type !== "session.revoked" || !m.sessionId) return;
    for (const cb of this.bySession.get(m.sessionId) ?? []) cb();
  }

  /** D36-1: called once when the session is revoked (logout, block, member removed, role change...). */
  async onSessionRevoked(sessionId: string, cb: Revoked): Promise<() => void> {
    await this.ensure();
    let set = this.bySession.get(sessionId);
    if (!set) this.bySession.set(sessionId, (set = new Set()));
    set.add(cb);
    return () => {
      const s = this.bySession.get(sessionId);
      s?.delete(cb);
      if (s && s.size === 0) this.bySession.delete(sessionId);
    };
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
      SELECT id::text AS id, topic, type, payload
        FROM app.read_events(${topics}::text[], ${afterId}::bigint, ${REPLAY_LIMIT}::int)`;
  }

  /** Oldest retained outbox id and the last id ever handed out (for `event: resync`). */
  async bounds(): Promise<{ minId: bigint | null; headId: bigint }> {
    const rows = await getDb().$queryRaw<{ min_id: bigint | null; head_id: bigint | null }[]>`
      SELECT min_id, head_id FROM app.event_bounds()`;
    return { minId: rows[0]?.min_id ?? null, headId: rows[0]?.head_id ?? 0n };
  }

  stats() {
    return {
      subscribers: this.subs,
      topics: this.byTopic.size,
      sessions: this.bySession.size,
      connected: !!this.client,
      reconnects: this.reconnects,
    };
  }

  async close() {
    this.closed = true;
    this.stopPing();
    await this.client?.end().catch(() => {});
  }
}

/**
 * T10 condition 1 (devops review): in staging/production the LISTEN connection MUST be configured
 * explicitly (direct, never a transaction-mode pooler). Falling back to DATABASE_URL there would
 * silently LISTEN through the pooler and lose notifications.
 */
export function realtimeDatabaseUrl(e: NodeJS.ProcessEnv = process.env): string {
  const strict = e.APP_ENV === "production" || e.APP_ENV === "staging";
  if (strict && !e.REALTIME_DATABASE_URL)
    throw new Error("REALTIME_DATABASE_URL is required when APP_ENV is staging or production (T10)");
  const url = e.REALTIME_DATABASE_URL || e.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const g = globalThis as unknown as { __realtime?: PgListenHub };
export function realtime(): PgListenHub {
  return (g.__realtime ??= new PgListenHub(realtimeDatabaseUrl()));
}
