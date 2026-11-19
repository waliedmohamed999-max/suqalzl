import { NextResponse } from "next/server";
import { toActionError } from "@/features/common/action";
import { uploadProductImage } from "@/features/admin/products";
import { SECTION_PERMISSION } from "@/features/admin/queries";
import { apiError, assertSameOrigin, handleError, noStore } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";
import { UPLOAD_POLICIES } from "@/lib/providers/storage";

export const runtime = "nodejs";

/**
 * POST multipart/form-data { file } -> 201 { path, url } (UploadedImageDTO)
 * 400 UPLOAD_REJECTED_TYPE | UPLOAD_REJECTED_SIZE · 401 · 403 · 503 STORAGE_UNAVAILABLE
 * Admin (products.review) only. The stored key is generated server-side; the client sends the
 * returned `path` in productUpsertInput.images. Works with s3, local and auto storage providers.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { principal } = await requirePermission(SECTION_PERMISSION.products, req);
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > UPLOAD_POLICIES.productImage.maxBytes + 64 * 1024) return apiError(400, "UPLOAD_REJECTED_SIZE");
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return apiError(400, "VALIDATION");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const r = await uploadProductImage(principal, { type: file.type, size: file.size, bytes });
    return NextResponse.json(r, { status: 201, headers: noStore });
  } catch (e) {
    const mapped = toActionError(e);
    if (mapped.code.startsWith("UPLOAD_REJECTED")) return apiError(400, mapped.code);
    if (mapped.code === "STORAGE_UNAVAILABLE") return apiError(503, mapped.code);
    return handleError(e);
  }
}
