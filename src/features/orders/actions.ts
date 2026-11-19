"use server";
import { account, requirePermission } from "@/lib/permissions";
import { toActionError } from "@/features/common/action";
import type { ActionResult } from "@/features/common/schema";
import { getMyOrder, listMyOrders } from "./queries";
import type { CustomerOrderDetailDTO, CustomerOrderListDTO } from "./schema";

/** "طلباتي": the signed-in person's own orders only (userId from the session, rule 8). */
export async function listMyOrdersAction(input: unknown = {}): Promise<ActionResult<CustomerOrderListDTO>> {
  try {
    const { principal } = await requirePermission(account());
    return { ok: true, data: await listMyOrders(principal.userId, input) };
  } catch (e) {
    return toActionError(e);
  }
}

export async function getMyOrderAction(input: unknown): Promise<ActionResult<CustomerOrderDetailDTO>> {
  try {
    const { principal } = await requirePermission(account());
    return { ok: true, data: await getMyOrder(principal.userId, input) };
  } catch (e) {
    return toActionError(e);
  }
}
