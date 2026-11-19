/**
 * Browser side of POST /api/admin/uploads/product-image (contract: uploadedImageDTO in
 * features/admin/schema.ts). XHR instead of fetch for upload progress. Images are re-encoded to
 * WebP with the long side <= 1600px before upload (README 4.6); if the browser cannot encode WebP
 * the original file is sent (the server validates type and size either way).
 */
import type { UploadedImageDTO } from "@/features/admin/schema";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_COUNT = 10;
const MAX_SIDE = 1600;

export type UploadErrorCode =
  "UPLOAD_REJECTED_TYPE" | "UPLOAD_REJECTED_SIZE" | "STORAGE_UNAVAILABLE" | "INVALID_IMAGE" | "NETWORK" | "INTERNAL";

export class UploadError extends Error {
  constructor(readonly code: UploadErrorCode) {
    super(code);
  }
}

/** Client-side pre-check (the server re-checks): type and size of the ORIGINAL file. */
export function precheck(file: File): UploadErrorCode | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "UPLOAD_REJECTED_TYPE";
  if (file.size > IMAGE_MAX_BYTES) return "UPLOAD_REJECTED_SIZE";
  return null;
}

export async function compressImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
    // Safari < 16 returns PNG for unknown types: keep the original then.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return blob;
  } catch {
    return file;
  }
}

export function uploadProductImage(blob: Blob, filename: string, onProgress: (pct: number) => void) {
  return new Promise<UploadedImageDTO>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/uploads/product-image");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new UploadError("NETWORK"));
    xhr.onload = () => {
      const body = xhr.response as (UploadedImageDTO & { error?: { code?: string } }) | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.path) return resolve({ path: body.path, url: body.url });
      const code = body?.error?.code;
      const known: UploadErrorCode[] = [
        "UPLOAD_REJECTED_TYPE",
        "UPLOAD_REJECTED_SIZE",
        "STORAGE_UNAVAILABLE",
        "INVALID_IMAGE",
      ];
      reject(new UploadError(known.includes(code as UploadErrorCode) ? (code as UploadErrorCode) : "INTERNAL"));
    };
    const fd = new FormData();
    const name = blob.type === "image/webp" ? filename.replace(/\.[a-z0-9]+$/i, "") + ".webp" : filename;
    fd.append("file", blob, name);
    xhr.send(fd);
  });
}
