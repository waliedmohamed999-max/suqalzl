/**
 * Local-disk StorageProvider (dev / owner preview only, M1-04). Files live under LOCAL_STORAGE_DIR
 * (default ./.data/storage/<bucket>/<key>). The PUBLIC bucket is served by the /media/[...key] route;
 * the PRIVATE bucket is never served (signed downloads are not supported here).
 * Not for production: one machine, no CDN (the "auto" provider never picks it in production).
 */
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BucketKind, SignedUpload, StorageProvider } from "./index";

const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}$/;

/** Throws for anything but a plain relative key (no "..", no absolute paths, no odd characters). */
export function assertSafeKey(key: string): string[] {
  const parts = key.split("/");
  if (parts.length === 0 || parts.length > 6 || parts.some((p) => !SAFE_SEGMENT.test(p) || p.includes("..")))
    throw new Error("invalid storage key");
  return parts;
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};
export function contentTypeForKey(key: string): string {
  return CONTENT_TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  constructor(private readonly root: string) {}

  filePath(bucket: BucketKind, key: string): string {
    return path.join(this.root, bucket, ...assertSafeKey(key));
  }

  async createSignedUpload(): Promise<SignedUpload> {
    // Browser -> storage presigned PUT needs a real S3 endpoint; uploads go through the server
    // route (POST /api/admin/uploads/product-image) which calls putObject().
    throw new Error("presigned uploads are not supported by the local storage provider");
  }
  async createSignedDownload(): Promise<string> {
    throw new Error("signed downloads are not supported by the local storage provider");
  }
  publicUrl(key: string): string {
    return `/media/${assertSafeKey(key).map(encodeURIComponent).join("/")}`;
  }
  async putObject(input: { bucket: BucketKind; key: string; body: Uint8Array; contentType: string }) {
    const file = this.filePath(input.bucket, input.key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, input.body);
  }
  async deleteObject(input: { bucket: BucketKind; key: string }) {
    await rm(this.filePath(input.bucket, input.key), { force: true });
  }
  async headObject(input: { bucket: BucketKind; key: string }) {
    try {
      const s = await stat(this.filePath(input.bucket, input.key));
      return s.isFile() ? { size: s.size, contentType: contentTypeForKey(input.key) } : null;
    } catch {
      return null;
    }
  }
  async readPublic(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.filePath("public", key));
    } catch {
      return null;
    }
  }
  async ping() {
    try {
      await mkdir(path.join(this.root, "public"), { recursive: true });
      return true;
    } catch {
      return false;
    }
  }
}
