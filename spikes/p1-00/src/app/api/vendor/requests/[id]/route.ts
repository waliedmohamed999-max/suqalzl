import { vendorScope } from "@/features/negotiation/service";
import { NotFoundError } from "@/lib/context";
import { sessionFromRequest } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vendor view: the request + HIS thread only (PriceRequestVendorDTO, belowYourFloor boolean). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = sessionFromRequest(req);
  if (!s) return new Response(null, { status: 401 });
  if (s.kind !== "vendor") return new Response(null, { status: 404 });
  const { id } = await params;
  try {
    return Response.json(await vendorScope(s).getRequest(id));
  } catch (e) {
    if (e instanceof NotFoundError || /uuid/i.test(String(e))) return new Response(null, { status: 404 });
    throw e;
  }
}
