import { resolveSession, tokenFromRequest } from "@/lib/auth/session";
import { authorizeTopics, realtime, type RealtimeMessage } from "@/lib/providers/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/stream?topics=a,b   (Last-Event-ID header or ?lastEventId= for replay)
 * Auth: session cookie (EventSource) or `Authorization: Bearer <session token>` (mobile app).
 * Frames:  retry -> [replayed events | resync] -> `event: ready` -> live events, `: hb` comments.
 * Event frame: id: <outbox id>\nevent: <type>\ndata: {"topic":..., "payload":{...ids/status/version}}
 *
 * Control frames (clients MUST handle both):
 * - `event: resync` (id = current head): the Last-Event-ID is older than the retained outbox (24 h)
 *   or more than 1000 events behind. Refetch the screen's state from the API, then keep listening.
 * - `event: revoked`, then the server closes (D36-1 / QA-B3): the session was revoked (logout, block,
 *   member removed, role/permission/password change) or no longer allows these topics. Call
 *   EventSource.close() (it would otherwise reconnect and get 401/403) and go to login.
 * Revocation: instant via the internal `session.revoked` notification; plus a re-check of the session
 * and the topics every REALTIME_REVALIDATE_SECONDS (60) as a fallback (lost NOTIFY, other instance).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("topics") ?? "").split(",");
  const token = tokenFromRequest(req); // cookie (EventSource) or Bearer (mobile)
  const state = await resolveSession(token);
  const principal = state?.principal ?? null;
  const auth = await authorizeTopics(principal, raw);
  if (!auth.ok) return new Response(null, { status: auth.status, headers: { "cache-control": "no-store" } });
  const topics = auth.topics;

  const lastRaw = req.headers.get("last-event-id") ?? url.searchParams.get("lastEventId");
  const lastId = lastRaw && /^\d{1,19}$/.test(lastRaw) ? BigInt(lastRaw) : null;
  const heartbeatMs = Number(process.env.REALTIME_HEARTBEAT_SECONDS ?? 25) * 1000;
  const maxLifetimeMs = Number(process.env.REALTIME_MAX_LIFETIME_SECONDS ?? 15 * 60) * 1000;
  const revalidateMs = Number(process.env.REALTIME_REVALIDATE_SECONDS ?? 60) * 1000;
  const hub = realtime();
  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const write = (s: string) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          open = false;
        }
      };
      let maxSent = lastId ?? 0n;
      const emit = (m: RealtimeMessage) => {
        const n = BigInt(m.id);
        if (n <= maxSent) return; // dedupe replay/live overlap
        maxSent = n;
        write(`id: ${m.id}\nevent: ${m.type}\ndata: ${JSON.stringify({ topic: m.topic, payload: m.payload })}\n\n`);
      };
      const resync = (reason: "expired" | "overflow", headId: bigint) => {
        if (headId > maxSent) maxSent = headId;
        write(`id: ${maxSent}\nevent: resync\ndata: ${JSON.stringify({ reason })}\n\n`);
      };
      /** Replay after `after`, or tell the client to refetch when the outbox cannot cover the gap. */
      const catchUp = async (after: bigint) => {
        const { minId, headId } = await hub.bounds();
        if (after >= headId) return;
        if (minId === null || after < minId - 1n) return resync("expired", headId);
        const missed = await hub.replay(topics, after);
        if (missed.length >= 1000) return resync("overflow", headId);
        missed.forEach(emit);
      };
      const revoke = () => {
        write(`event: revoked\ndata: {}\n\n`);
        cleanup();
      };

      // Subscribe first and buffer, then replay, then flush: no gap between replay and live.
      let buffering = true;
      const buffer: RealtimeMessage[] = [];
      const unsub = await hub.subscribe(
        topics,
        (m) => (buffering ? buffer.push(m) : emit(m)),
        // LISTEN reconnected: replay the gap, and re-check the session (a NOTIFY may have been missed)
        () => {
          void catchUp(maxSent).catch(() => cleanup());
          void revalidate();
        },
      );
      const unwatch = state ? await hub.onSessionRevoked(state.sessionId, revoke) : () => {};
      write("retry: 3000\n\n");
      if (lastId !== null) await catchUp(lastId);
      buffering = false;
      for (const m of buffer) emit(m);
      write(`event: ready\ndata: ${JSON.stringify({ serverTime: new Date().toISOString() })}\n\n`);

      async function revalidate() {
        if (!open || !state) return;
        try {
          const now = await resolveSession(token);
          const again = now?.principal ? await authorizeTopics(now.principal, topics) : null;
          if (!now || now.sessionId !== state.sessionId || !again?.ok) revoke();
        } catch {
          /* database hiccup: keep the stream, try again next tick */
        }
      }

      const hb = setInterval(() => write(`: hb ${Date.now()}\n\n`), heartbeatMs);
      const reval = state ? setInterval(() => void revalidate(), revalidateMs) : null;
      const life = setTimeout(() => cleanup(), maxLifetimeMs);
      cleanup = () => {
        if (!open) return;
        open = false;
        clearInterval(hb);
        if (reval) clearInterval(reval);
        clearTimeout(life);
        unsub();
        unwatch();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
