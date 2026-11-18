import { customerScope } from "@/features/negotiation/service";
import { NotFoundError } from "@/lib/context";
import { sessionFromRequest } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Customer view: all offers on HIS request (PriceRequestCustomerDTO). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = sessionFromRequest(req);
  if (!s) return new Response(null, { status: 401 });
  if (s.kind !== "customer") return new Response(null, { status: 404 });
  const { id } = await params;
  try {
    return Response.json(await customerScope(s).getRequest(id));
  } catch (e) {
    if (e instanceof NotFoundError || (e as { name?: string }).name === "ZodError" || /uuid/i.test(String(e)))
      return new Response(null, { status: 404 });
    throw e;
  }
}
