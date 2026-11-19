/**
 * StorageProvider (D12, SPEC §2/§9): any S3-compatible service (SeaweedFS in dev, chosen host later).
 * - PUBLIC bucket: product images (anonymous read). URL from publicUrl(key) — a CDN later, never a
 *   hard-coded string in app code (notes-for-backend §3).
 * - PRIVATE bucket: vendor documents, IBAN letters, receipts, invoices — presigned URLs only, short TTL.
 * - Uploads go browser → storage with a presigned PUT; type and size are validated on the server
 *   BEFORE the URL is issued (the signed Content-Length/Content-Type must match).
 */
import { env } from "../../env";
import path from "node:path";
import { AutoStorageProvider } from "./auto";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export type BucketKind = "public" | "private";

export interface SignedUpload {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
  expiresAt: Date;
}

export interface StorageProvider {
  readonly name: string;
  createSignedUpload(input: {
    bucket: BucketKind;
    key: string;
    contentType: string;
    contentLength: number;
  }): Promise<SignedUpload>;
  createSignedDownload(input: {
    bucket: BucketKind;
    key: string;
    ttlSeconds?: number;
    downloadName?: string;
  }): Promise<string>;
  publicUrl(key: string): string;
  putObject(input: { bucket: BucketKind; key: string; body: Uint8Array; contentType: string }): Promise<void>;
  deleteObject(input: { bucket: BucketKind; key: string }): Promise<void>;
  headObject(input: { bucket: BucketKind; key: string }): Promise<{ size: number; contentType: string | null } | null>;
  ping(): Promise<boolean>;
}

/** Upload policies (SPEC §9: types and sizes are fixed). */
export const UPLOAD_POLICIES = {
  productImage: {
    bucket: "public",
    types: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    maxBytes: 8 * 1024 * 1024,
  },
  vendorDocument: {
    bucket: "private",
    types: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 10 * 1024 * 1024,
  },
  payoutReceipt: {
    bucket: "private",
    types: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 10 * 1024 * 1024,
  },
  returnPhoto: { bucket: "private", types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024 },
} as const satisfies Record<string, { bucket: BucketKind; types: readonly string[]; maxBytes: number }>;
export type UploadPolicyName = keyof typeof UPLOAD_POLICIES;

export class UploadRejectedError extends Error {
  readonly code = "UPLOAD_REJECTED";
  constructor(reason: "TYPE" | "SIZE") {
    super(`UPLOAD_REJECTED_${reason}`);
  }
}

export function checkUpload(policy: UploadPolicyName, contentType: string, contentLength: number) {
  const p = UPLOAD_POLICIES[policy];
  if (!(p.types as readonly string[]).includes(contentType)) throw new UploadRejectedError("TYPE");
  if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > p.maxBytes)
    throw new UploadRejectedError("SIZE");
  return p;
}

/** Server-generated object keys only (never trust a client-supplied path). */
export function objectKey(prefix: string, ext: string): string {
  const safePrefix = prefix
    .split("/")
    .map((seg) => seg.replace(/[^a-z0-9_-]/gi, ""))
    .filter(Boolean)
    .join("/");
  const safeExt = ext
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 5)
    .toLowerCase();
  return `${safePrefix}/${crypto.randomUUID()}.${safeExt}`;
}

let instance: StorageProvider | undefined;
/**
 * STORAGE_PROVIDER: s3 (default) | local | auto (S3 when reachable, local disk otherwise — dev and
 * the owner preview). Production always uses s3, whatever the variable says.
 */
export function storageProvider(): StorageProvider {
  if (instance) return instance;
  const e = env();
  const s3 = () =>
    new S3StorageProvider({
      endpoint: e.S3_ENDPOINT,
      publicEndpoint: e.S3_PUBLIC_ENDPOINT ?? e.S3_ENDPOINT,
      region: e.S3_REGION,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      buckets: { public: e.S3_BUCKET_PUBLIC, private: e.S3_BUCKET_PRIVATE },
      signedUrlTtlSeconds: e.S3_SIGNED_URL_TTL_SECONDS,
    });
  const kind = e.APP_ENV === "production" || e.NODE_ENV === "production" ? "s3" : e.STORAGE_PROVIDER;
  const local = () => new LocalStorageProvider(path.resolve(e.LOCAL_STORAGE_DIR));
  instance =
    kind === "s3" ? s3() : kind === "local" ? local() : new AutoStorageProvider(e.S3_ENDPOINT ? s3() : null, local());
  return instance;
}
export function setStorageProvider(p: StorageProvider | undefined) {
  instance = p;
}

/** Public URL of a stored public-bucket key (product images, banners). */
export function mediaUrl(key: string): string {
  return storageProvider().publicUrl(key);
}
