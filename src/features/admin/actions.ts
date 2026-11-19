"use server";
/**
 * /admin Server Actions (M1-03). Each starts with requirePermission(...) for its section (SPEC §4),
 * then the service authorizes again (defence in depth) and runs in the admin RLS context.
 * Results are ActionResult; the UI maps error codes to messages/ar.json "errors.*".
 */
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getPrincipal } from "@/lib/auth/session";
import { clientIp } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";
import { toActionError } from "@/features/common/action";
import type { ActionResult } from "@/features/common/schema";
import {
  SECTION_PERMISSION,
  getAdminCapabilities,
  getAdminCustomer,
  getAdminDashboard,
  getAdminOrder,
  getAdminSettings,
  listAdminCategories,
  listAdminCustomers,
  listAdminOrders,
  listAdminStaff,
  listAuditLogs,
} from "./queries";
import { getAdminProduct, listAdminProducts, saveProduct } from "./products";
import type {
  AdminCapabilitiesDTO,
  AdminCategoryDTO,
  AdminCustomerDetailDTO,
  AdminCustomerListDTO,
  AdminDashboardDTO,
  AdminOrderDetailDTO,
  AdminOrderListDTO,
  AdminProductDetailDTO,
  AdminProductListDTO,
  AdminSection,
  AdminSettingsDTO,
  AdminStaffListDTO,
  AuditLogListDTO,
} from "./schema";

async function run<T>(
  section: AdminSection,
  fn: (p: Awaited<ReturnType<typeof requirePermission>>["principal"]) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const { principal } = await requirePermission(SECTION_PERMISSION[section]);
    return { ok: true, data: await fn(principal) };
  } catch (e) {
    return toActionError(e);
  }
}

async function meta() {
  const h = await headers();
  return { ip: clientIp(h), userAgent: h.get("user-agent")?.slice(0, 400) ?? null };
}

/** Any staff session (no section permission): getAdminCapabilities throws 401/403 for others. */
export async function getAdminCapabilitiesAction(): Promise<ActionResult<AdminCapabilitiesDTO>> {
  try {
    return { ok: true, data: await getAdminCapabilities(await getPrincipal()) };
  } catch (e) {
    return toActionError(e);
  }
}
export async function getAdminDashboardAction(input: unknown = {}): Promise<ActionResult<AdminDashboardDTO>> {
  return run("dashboard", (p) => getAdminDashboard(p, input));
}

// products
export async function listAdminProductsAction(input: unknown = {}): Promise<ActionResult<AdminProductListDTO>> {
  return run("products", (p) => listAdminProducts(p, input));
}
export async function getAdminProductAction(id: string): Promise<ActionResult<AdminProductDetailDTO>> {
  return run("products", (p) => getAdminProduct(p, String(id)));
}
function revalidateCatalog() {
  try {
    revalidateTag("catalog");
    revalidatePath("/[locale]", "layout");
  } catch {
    // outside a request (tests): nothing to revalidate
  }
}
export async function createProductAction(input: unknown) {
  const r = await run("products", async (p) => saveProduct(p, input, { meta: await meta() }));
  if (r.ok) revalidateCatalog();
  return r;
}
export async function updateProductAction(id: string, input: unknown) {
  const r = await run("products", async (p) => saveProduct(p, input, { id: String(id), meta: await meta() }));
  if (r.ok) revalidateCatalog();
  return r;
}

// categories
export async function listAdminCategoriesAction(): Promise<ActionResult<AdminCategoryDTO[]>> {
  return run("categories", (p) => listAdminCategories(p));
}

// orders + customers (read)
export async function listAdminOrdersAction(input: unknown = {}): Promise<ActionResult<AdminOrderListDTO>> {
  return run("orders", (p) => listAdminOrders(p, input));
}
export async function getAdminOrderAction(number: string): Promise<ActionResult<AdminOrderDetailDTO>> {
  return run("orders", (p) => getAdminOrder(p, String(number)));
}
export async function listAdminCustomersAction(input: unknown = {}): Promise<ActionResult<AdminCustomerListDTO>> {
  return run("customers", (p) => listAdminCustomers(p, input));
}
export async function getAdminCustomerAction(id: string): Promise<ActionResult<AdminCustomerDetailDTO>> {
  return run("customers", (p) => getAdminCustomer(p, String(id)));
}

// settings, staff, audit (read)
export async function getAdminSettingsAction(): Promise<ActionResult<AdminSettingsDTO>> {
  return run("settings", (p) => getAdminSettings(p));
}
export async function listAdminStaffAction(): Promise<ActionResult<AdminStaffListDTO>> {
  return run("staff", (p) => listAdminStaff(p));
}
export async function listAuditLogsAction(input: unknown = {}): Promise<ActionResult<AuditLogListDTO>> {
  return run("audit", (p) => listAuditLogs(p, input));
}
