/** Minimal SSE client over fetch streaming (what EventSource does, but with headers). */
export interface SseEvent {
  id?: string;
  event: string;
  data: string;
  at: number;
}

export interface SseConn {
  status: number;
  events: SseEvent[];
  raw: string[]; // every raw frame, comments included — scanned by leak tests
  close(): void;
  waitFor(pred: (e: SseEvent) => boolean, timeoutMs?: number): Promise<SseEvent>;
  waitCount(pred: (e: SseEvent) => boolean, n: number, timeoutMs?: number): Promise<SseEvent[]>;
}

export async function sse(
  base: string,
  topicsList: string[],
  opts: { token?: string; lastEventId?: string } = {},
): Promise<SseConn> {
  const ac = new AbortController();
  const headers: Record<string, string> = { accept: "text/event-stream" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.lastEventId) headers["last-event-id"] = opts.lastEventId;
  const res = await fetch(`${base}/api/realtime/stream?topics=${encodeURIComponent(topicsList.join(","))}`, {
    headers,
    signal: ac.signal,
  });
  const events: SseEvent[] = [];
  const raw: string[] = [];
  const waiters = new Set<() => void>();
  const conn: SseConn = {
    status: res.status,
    events,
    raw,
    close: () => ac.abort(),
    waitFor(pred, timeoutMs = 5000) {
      return conn.waitCount(pred, 1, timeoutMs).then((x) => x[0]!);
    },
    waitCount(pred, n, timeoutMs = 5000) {
      return new Promise((resolve, reject) => {
        const check = () => {
          const m = events.filter(pred);
          if (m.length >= n) {
            waiters.delete(check);
            clearTimeout(t);
            resolve(m);
          }
        };
        const t = setTimeout(() => {
          waiters.delete(check);
          reject(new Error(`timeout waiting for ${n} events (have ${events.filter(pred).length})`));
        }, timeoutMs);
        waiters.add(check);
        check();
      });
    },
  };
  if (!res.ok || !res.body) return conn;

  void (async () => {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          raw.push(frame);
          const ev: SseEvent = { event: "message", data: "", at: performance.now() };
          let isEvent = false;
          for (const line of frame.split("\n")) {
            if (line.startsWith(":")) continue;
            const [k, ...rest] = line.split(":");
            const v = rest.join(":").replace(/^ /, "");
            if (k === "id") ev.id = v;
            else if (k === "event") ev.event = v;
            else if (k === "data") {
              ev.data += v;
              isEvent = true;
            }
          }
          if (isEvent) {
            events.push(ev);
            for (const w of [...waiters]) w();
          }
        }
      }
    } catch {
      /* aborted */
    }
  })();
  return conn;
}

export const payloadOf = (e: SseEvent) => JSON.parse(e.data) as { topic: string; payload: Record<string, unknown> };
