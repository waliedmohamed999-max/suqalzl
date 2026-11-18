import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { customerScope, vendorScope } from "@/features/negotiation/service";
import { withCtx } from "@/lib/context";
import { topics } from "@/lib/realtime/events";
import { publish } from "@/lib/realtime/publish";
import { signSession } from "@/lib/session";
import { AUTO_A, AUTO_B, customerSession, FLOOR_A, FLOOR_B, percentile, seed, truncateAll, vendorSession, type Seed } from "./helpers";
import { payloadOf, sse, type SseConn } from "./sse-client";

/**
 * Runs the REAL Next.js production server (`next start`) and talks to the Route Handler over HTTP.
 * Requires `npm run build` first (the `pretest` script does it).
 */
const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
let server: ChildProcess;
let s: Seed;
const tok = {
  A: "",
  B: "",
  C: "",
  c1: "",
  c2: "",
};
const open: SseConn[] = [];
const track = (c: SseConn) => (open.push(c), c);

const SECRET_NUMBERS = [FLOOR_A, AUTO_A, FLOOR_B, AUTO_B].map(String);

async function waitHttp(url: string, ms = 60_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("server did not start");
}

beforeAll(async () => {
  await truncateAll();
  s = await seed();
  tok.A = signSession(vendorSession(s, "A"));
  tok.B = signSession(vendorSession(s, "B"));
  tok.C = signSession(vendorSession(s, "C"));
  tok.c1 = signSession(customerSession(s, 1));
  tok.c2 = signSession(customerSession(s, 2));
  const portBusy = await fetch(`${BASE}/`).then(() => true, () => false);
  if (portBusy) throw new Error(`port ${PORT} already in use — stale server?`);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    detached: true,
    env: { ...process.env, SSE_HEARTBEAT_MS: "1000", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr?.on("data", (d) => process.stderr.write(`[next] ${d}`));
  await waitHttp(`${BASE}/`);
});

afterAll(async () => {
  for (const c of open) c.close();
  if (server?.pid) process.kill(-server.pid, "SIGTERM"); // whole process group
});

describe("SSE subscription authorization (server-side, all-or-nothing)", () => {
  let requestId: string;
  beforeAll(async () => {
    requestId = (
      await customerScope(customerSession(s, 1)).createRequest({ variantId: s.variantA, qty: 1, targetPrice: 160_000 })
    ).requestId;
  });

  const cases: [string, () => string[], () => string | undefined, number][] = [
    ["no session on private topic", () => [topics.vendorInbox(s.vendorA)], () => undefined, 401],
    ["vendor B -> vendor A's thread channel", () => [topics.prVendor(requestId, s.vendorA)], () => tok.B, 403],
    ["vendor B -> vendor A's inbox", () => [topics.vendorInbox(s.vendorA)], () => tok.B, 403],
    ["vendor B -> customer channel", () => [topics.prCustomer(requestId)], () => tok.B, 403],
    ["vendor C (not recipient) -> own-looking thread channel", () => [topics.prVendor(requestId, s.vendorC)], () => tok.C, 403],
    ["customer 2 -> customer 1's request", () => [topics.prCustomer(requestId)], () => tok.c2, 403],
    ["customer -> vendor thread channel", () => [topics.prVendor(requestId, s.vendorA)], () => tok.c1, 403],
    ["one bad topic poisons the whole stream", () => ["souq", topics.vendorInbox(s.vendorB), topics.vendorInbox(s.vendorA)], () => tok.B, 403],
    ["malformed topic", () => ["pr:*:vendor:*"], () => tok.A, 400],
    ["forged session token", () => [topics.vendorInbox(s.vendorA)], () => tok.B.replace(/.$/, (c) => (c === "A" ? "B" : "A")), 401],
    ["vendor A -> own thread channel + inbox", () => [topics.prVendor(requestId, s.vendorA), topics.vendorInbox(s.vendorA)], () => tok.A, 200],
    ["customer 1 -> own request", () => [topics.prCustomer(requestId)], () => tok.c1, 200],
    ["anonymous -> public souq", () => ["souq"], () => undefined, 200],
  ];
  it.each(cases)("%s", async (_name, t, token, expected) => {
    const c = track(await sse(BASE, t(), { token: token() }));
    expect(c.status).toBe(expected);
    if (expected !== 200) expect(c.events).toEqual([]);
    c.close();
  });
});

describe("sealed negotiation over SSE", () => {
  it("each audience gets only its own events; no price/floor ever appears in any frame", async () => {
    const inboxA = track(await sse(BASE, [topics.vendorInbox(s.vendorA)], { token: tok.A }));
    const inboxB = track(await sse(BASE, [topics.vendorInbox(s.vendorB)], { token: tok.B }));
    const inboxC = track(await sse(BASE, [topics.vendorInbox(s.vendorC)], { token: tok.C }));
    await Promise.all([inboxA, inboxB, inboxC].map((c) => c.waitFor((e) => e.event === "ready")));

    const cust = customerScope(customerSession(s, 1));
    const { requestId } = await cust.createRequest({ variantId: s.variantA, qty: 1, targetPrice: 120_000 }); // below both floors
    await inboxA.waitFor((e) => e.event === "request.created" && payloadOf(e).payload.requestId === requestId);
    await inboxB.waitFor((e) => e.event === "request.created" && payloadOf(e).payload.requestId === requestId);
    await new Promise((r) => setTimeout(r, 300));
    expect(inboxC.events.filter((e) => e.event === "request.created")).toHaveLength(0); // other category

    const custStream = track(await sse(BASE, [topics.prCustomer(requestId)], { token: tok.c1 }));
    const aStream = track(await sse(BASE, [topics.prVendor(requestId, s.vendorA)], { token: tok.A }));
    const bStream = track(await sse(BASE, [topics.prVendor(requestId, s.vendorB)], { token: tok.B }));
    await Promise.all([custStream, aStream, bStream].map((c) => c.waitFor((e) => e.event === "ready")));

    const oa = await vendorScope(vendorSession(s, "A")).submitOffer({ requestId, variantId: s.variantA, unitPrice: 180_000, qty: 1, shippingFee: 2_500 });
    const ob = await vendorScope(vendorSession(s, "B")).submitOffer({ requestId, variantId: s.variantB, unitPrice: 175_000, qty: 1, shippingFee: 0 });

    // customer sees both threads
    const ct = await custStream.waitCount((e) => e.event === "thread.changed", 2);
    expect(new Set(ct.map((e) => payloadOf(e).payload.threadId))).toEqual(new Set([oa.threadId, ob.threadId]));

    // customer counters A -> only A (and customer) hear about it
    await cust.counterOffer({ threadId: oa.threadId, unitPrice: 165_000 });
    await aStream.waitCount((e) => e.event === "thread.changed", 2);
    await custStream.waitCount((e) => e.event === "thread.changed", 3);

    // customer accepts B -> B gets its thread, A gets "closed" only
    await cust.acceptOffer({ offerId: ob.offerId });
    await bStream.waitCount((e) => e.event === "thread.changed", 2);
    const closed = await aStream.waitFor((e) => e.event === "request.changed");
    expect(payloadOf(closed).payload).toEqual({ requestId, status: "CLOSED", version: expect.any(Number) });
    await custStream.waitFor((e) => e.event === "request.changed" && payloadOf(e).payload.status === "ACCEPTED");
    await new Promise((r) => setTimeout(r, 300));

    // ---- sealed: A never sees B's ids, B never sees A's
    const aRaw = aStream.raw.join("\n") + inboxA.raw.join("\n");
    const bRaw = bStream.raw.join("\n") + inboxB.raw.join("\n");
    expect(aRaw).not.toContain(ob.threadId);
    expect(aRaw).not.toContain(ob.offerId);
    expect(aRaw).not.toContain(s.vendorB);
    expect(bRaw).not.toContain(oa.threadId);
    expect(bRaw).not.toContain(oa.offerId);
    expect(bRaw).not.toContain(s.vendorA);
    expect(aStream.events.filter((e) => e.event !== "ready").every((e) => payloadOf(e).topic === topics.prVendor(requestId, s.vendorA))).toBe(true);
    expect(bStream.events.filter((e) => e.event !== "ready").every((e) => payloadOf(e).topic === topics.prVendor(requestId, s.vendorB))).toBe(true);

    // ---- no thresholds, no prices at all on private channels (ids/status/version only)
    const everything = [custStream, aStream, bStream, inboxA, inboxB, inboxC].flatMap((c) => c.raw).join("\n");
    expect(everything).not.toMatch(/floor|autoAccept|unitPrice|targetPrice|shippingFee|iban/i);
    for (const n of [...SECRET_NUMBERS, "180000", "175000", "165000", "120000"]) expect(everything).not.toContain(n);
    console.log(
      `[metric] sealed flow frames: customer=${custStream.events.length} vendorA=${aStream.events.length} vendorB=${bStream.events.length} inboxA=${inboxA.events.length} inboxB=${inboxB.events.length} inboxC=${inboxC.events.filter((e) => e.event !== "ready").length}`,
    );

    // ---- the protected detail APIs the UI calls after a signal
    const get = async (path: string, t: string) => (await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${t}` } }));
    const aJson = await (await get(`/api/vendor/requests/${requestId}`, tok.A)).text();
    const bJson = await (await get(`/api/vendor/requests/${requestId}`, tok.B)).text();
    const cJson = await (await get(`/api/requests/${requestId}`, tok.c1)).text();
    expect(JSON.parse(aJson).belowYourFloor).toBe(true); // owner: boolean only
    expect(JSON.parse(bJson).belowYourFloor).toBeNull(); // competitor: nothing
    expect(aJson).not.toContain(ob.offerId);
    expect(aJson).not.toContain("175000");
    expect(bJson).not.toContain(oa.offerId);
    expect(bJson).not.toContain("180000");
    expect(JSON.parse(cJson).threads).toHaveLength(2);
    for (const body of [aJson, bJson, cJson]) {
      expect(body).not.toMatch(/floorPrice|autoAcceptPrice|iban/);
      for (const n of SECRET_NUMBERS) expect(body).not.toContain(n);
    }
    expect(cJson).not.toContain("belowYourFloor");
    expect((await get(`/api/requests/${requestId}`, tok.c2)).status).toBe(404);
    expect((await get(`/api/vendor/requests/${requestId}`, tok.C)).status).toBe(404);
  });

  it("strict event schema refuses to publish a payload with an extra key", async () => {
    await expect(
      withCtx({ kind: "system" }, (tx) =>
        publish(tx, topics.souq(), "request.created", { requestId: randomUUID(), version: 1, floorPrice: 1 } as never),
      ),
    ).rejects.toThrow(/Unrecognized key|unrecognized/i);
  });
});

describe("delivery semantics", () => {
  it("rolled-back transaction delivers nothing; committed one delivers once", async () => {
    const c = track(await sse(BASE, ["souq"]));
    await c.waitFor((e) => e.event === "ready");
    const dealRolled = randomUUID();
    const dealCommitted = randomUUID();
    await withCtx({ kind: "system" }, async (tx) => {
      await publish(tx, "souq", "deal.updated", { dealId: dealRolled, left: 2, status: "LIVE", endsAt: new Date().toISOString(), version: 1 });
      throw new Error("rollback");
    }).catch(() => {});
    await withCtx({ kind: "system" }, (tx) =>
      publish(tx, "souq", "deal.updated", { dealId: dealCommitted, left: 1, status: "LIVE", endsAt: new Date().toISOString(), version: 2 }),
    );
    await c.waitFor((e) => e.event === "deal.updated" && payloadOf(e).payload.dealId === dealCommitted);
    await new Promise((r) => setTimeout(r, 300));
    expect(c.events.filter((e) => e.data.includes(dealRolled))).toHaveLength(0);
    expect(c.events.filter((e) => e.data.includes(dealCommitted))).toHaveLength(1);
  });

  it("Last-Event-ID replays exactly the missed events, only for authorized topics", async () => {
    const c1 = track(await sse(BASE, [topics.vendorInbox(s.vendorA)], { token: tok.A }));
    await c1.waitFor((e) => e.event === "ready");
    const first = randomUUID();
    await withCtx({ kind: "system" }, (tx) => publish(tx, topics.vendorInbox(s.vendorA), "request.created", { requestId: first, version: 1 }));
    const got = await c1.waitFor((e) => e.data.includes(first));
    c1.close();
    const missed = [randomUUID(), randomUUID(), randomUUID()];
    await withCtx({ kind: "system" }, async (tx) => {
      for (const id of missed) await publish(tx, topics.vendorInbox(s.vendorA), "request.created", { requestId: id, version: 1 });
      await publish(tx, topics.vendorInbox(s.vendorB), "request.created", { requestId: randomUUID(), version: 1 }); // other vendor
    });
    const c2 = track(await sse(BASE, [topics.vendorInbox(s.vendorA)], { token: tok.A, lastEventId: got.id }));
    await c2.waitFor((e) => e.event === "ready");
    const replayed = c2.events.filter((e) => e.event === "request.created").map((e) => payloadOf(e).payload.requestId);
    expect(replayed).toEqual(missed);
    expect(c2.raw.join()).not.toContain(s.vendorB);
  });

  it("LISTEN connection killed: hub reconnects and streams replay the gap (no loss)", async () => {
    const c = track(await sse(BASE, [topics.vendorInbox(s.vendorB)], { token: tok.B }));
    await c.waitFor((e) => e.event === "ready");
    const admin = new pg.Client({ connectionString: process.env.ADMIN_DATABASE_URL!.replace(/\/[^/]*$/, "/suq_spike") });
    await admin.connect();
    const k = await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'suq_app' AND query = 'LISTEN realtime'",
    );
    expect(k.rowCount).toBeGreaterThan(0);
    await admin.end();
    const gap = [randomUUID(), randomUUID(), randomUUID()];
    await withCtx({ kind: "system" }, async (tx) => {
      for (const id of gap) await publish(tx, topics.vendorInbox(s.vendorB), "request.created", { requestId: id, version: 1 });
    });
    const evs = await c.waitCount((e) => e.event === "request.created" && (gap as string[]).includes(String(payloadOf(e).payload.requestId)), 3, 8000);
    expect(evs.map((e) => payloadOf(e).payload.requestId)).toEqual(gap);
  });

  it("heartbeat comments keep the stream alive", async () => {
    const c = track(await sse(BASE, ["souq"]));
    await new Promise((r) => setTimeout(r, 2300));
    expect(c.raw.filter((f) => f.startsWith(": hb")).length).toBeGreaterThanOrEqual(2);
  });
});

describe("performance (single Next.js process, local Postgres)", () => {
  it("commit -> browser latency over 200 events", async () => {
    const c = track(await sse(BASE, [topics.vendorInbox(s.vendorA)], { token: tok.A }));
    await c.waitFor((e) => e.event === "ready");
    const lat: number[] = [];
    for (let i = 0; i < 200; i++) {
      const id = randomUUID();
      const t0 = performance.now();
      await withCtx({ kind: "system" }, (tx) => publish(tx, topics.vendorInbox(s.vendorA), "request.created", { requestId: id, version: i }));
      const e = await c.waitFor((x) => x.data.includes(id));
      lat.push(e.at - t0);
    }
    console.log(
      `[metric] publish(tx)+commit -> SSE frame received: p50 ${percentile(lat, 50).toFixed(2)} ms, p95 ${percentile(lat, 95).toFixed(2)} ms, max ${Math.max(...lat).toFixed(2)} ms (N=200)`,
    );
    expect(percentile(lat, 95)).toBeLessThan(250);
  });

  it("fan-out: 500 concurrent souq streams receive one deal update", async () => {
    const N = 500;
    const conns = await Promise.all(Array.from({ length: N }, () => sse(BASE, ["souq"])));
    conns.forEach(track);
    expect(conns.every((c) => c.status === 200)).toBe(true);
    await Promise.all(conns.map((c) => c.waitFor((e) => e.event === "ready", 20_000)));
    const dealId = randomUUID();
    const t0 = performance.now();
    await withCtx({ kind: "system" }, (tx) =>
      publish(tx, "souq", "deal.updated", { dealId, left: 3, status: "LIVE", endsAt: new Date().toISOString(), version: 1 }),
    );
    const got = await Promise.all(conns.map((c) => c.waitFor((e) => e.data.includes(dealId), 20_000)));
    const lat = got.map((e) => e.at - t0);
    console.log(
      `[metric] fan-out to ${N} SSE clients: p50 ${percentile(lat, 50).toFixed(1)} ms, p95 ${percentile(lat, 95).toFixed(1)} ms, last ${Math.max(...lat).toFixed(1)} ms`,
    );
    conns.forEach((c) => c.close());
  }, 60_000);
});
