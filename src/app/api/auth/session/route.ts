import { NextResponse } from "next/server";
import { sessionDTO } from "@/features/auth/schema";
import { resolveSession, tokenFromRequest } from "@/lib/auth/session";
import { handleError, noStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → SessionDTO (who am I). Never returns phone/e-mail: the UI fetches profile data separately. */
export async function GET(req: Request) {
  try {
    const s = await resolveSession(tokenFromRequest(req));
    const p = s?.principal ?? null;
    const body = sessionDTO.parse({
      authenticated: !!p,
      requires2fa: !!s?.twoFactorPending,
      area: p ? (p.kind === "staff" ? "admin" : p.kind === "vendor" ? "vendor" : "account") : null,
      user: p ? { id: p.userId, role: p.role } : null,
      vendorId: p?.kind === "vendor" ? p.vendorId : null,
      permissions: p && p.kind !== "customer" ? [...p.permissions] : [],
    });
    return NextResponse.json(body, { headers: noStore });
  } catch (e) {
    return handleError(e);
  }
}
