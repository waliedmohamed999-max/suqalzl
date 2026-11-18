import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Ctx } from "./context";

/**
 * Stand-in for Better Auth server sessions: an HMAC-signed token. The point for the spike is that
 * vendorId/userId come from something the client cannot forge, never from query/body.
 */
const sessionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("vendor"), userId: z.uuid(), vendorId: z.uuid() }).strict(),
  z.object({ kind: z.literal("customer"), userId: z.uuid() }).strict(),
  z.object({ kind: z.literal("admin"), userId: z.uuid() }).strict(),
]);
export type Session = z.infer<typeof sessionSchema>;

const secret = () => {
  const s = process.env.SPIKE_SESSION_SECRET;
  if (!s) throw new Error("SPIKE_SESSION_SECRET missing");
  return s;
};

export function signSession(s: Session): string {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function readSession(token: string | null | undefined): Session | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    return sessionSchema.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

export function sessionFromRequest(req: Request): Session | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return readSession(auth.slice(7));
  const cookie = req.headers.get("cookie") ?? "";
  const m = /(?:^|;\s*)spike_session=([^;]+)/.exec(cookie);
  return readSession(m?.[1] ? decodeURIComponent(m[1]) : null);
}

export function ctxFromSession(s: Session): Ctx {
  return s;
}
