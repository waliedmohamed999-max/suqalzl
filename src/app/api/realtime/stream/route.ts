import { getPrincipalFromRequest } from "@/lib/auth/session";
import { authorizeTopics, realtime, type RealtimeMessage } from "@/lib/providers/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/stream?topics=a,b   (Last-Event-ID header or ?lastEventId= for replay)
 * Auth: session cookie (EventSource) or `Authorization: Bearer <session token>` (mobile app).
 * Frames:  retry -> [replayed events] -> `event: ready` -> live events, `: hb` comments.
 * Event frame: id: <outbox id>\nevent: <type>\ndata: {"topic":..., "payload":{...ids/status/version}}
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("topics") ?? "").split(",");
  const principal = await getPrincipalFromRequest(req); // cookie (EventSource) or Bearer (mobile)
  const auth = await authorizeTopics(principal, raw);
  if (!auth.ok) return new Response(null, { status: auth.status, headers: { "cache-control": "no-store" } });

  const lastRaw = req.headers.get("last-event-id") ?? url.searchParams.get("lastEventId");
  const lastId = lastRaw && /^\d{1,19}$/.test(lastRaw) ? BigInt(lastRaw) : null;
  const heartbeatMs = Number(process.env.REALTIME_HEARTBEAT_SECONDS ?? 25) * 1000;
  const maxLifetimeMs = Number(process.env.REALTIME_MAX_LIFETIME_SECONDS ?? 15 * 60) * 1000;
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

      // Subscribe first and buffer, then replay, then flush: no gap between replay and live.
      let buffering = true;
      const buffer: RealtimeMessage[] = [];
      const unsub = await hub.subscribe(
        auth.topics,
        (m) => (buffering ? buffer.push(m) : emit(m)),
        () => void hub.replay(auth.topics, maxSent).then((ms) => ms.forEach(emit)).catch(() => cleanup()),
      );
      write("retry: 3000\n\n");
      if (lastId !== null) for (const m of await hub.replay(auth.topics, lastId)) emit(m);
      buffering = false;
      for (const m of buffer) emit(m);
      write(`event: ready\ndata: ${JSON.stringify({ serverTime: new Date().toISOString() })}\n\n`);

      const hb = setInterval(() => write(`: hb ${Date.now()}\n\n`), heartbeatMs);
      const life = setTimeout(() => cleanup(), maxLifetimeMs);
      cleanup = () => {
        if (!open) return;
        open = false;
        clearInterval(hb);
        clearTimeout(life);
        unsub();
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
