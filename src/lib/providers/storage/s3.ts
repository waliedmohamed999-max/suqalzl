import {
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { BucketKind, SignedUpload, StorageProvider } from "./index";

interface S3Config {
  endpoint?: string;
  publicEndpoint?: string;
  region: string;
  forcePathStyle: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  buckets: Record<BucketKind, string>;
  signedUrlTtlSeconds: number;
}

/**
 * Two clients (notes-for-backend §3): `server` talks to S3_ENDPOINT, `signer` signs URLs for
 * S3_PUBLIC_ENDPOINT because the signature covers the host the browser will call.
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  private readonly server: S3Client;
  private readonly signer: S3Client;

  constructor(private readonly cfg: S3Config) {
    const credentials =
      cfg.accessKeyId && cfg.secretAccessKey ? { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } : undefined;
    const base = { region: cfg.region, forcePathStyle: cfg.forcePathStyle, credentials };
    this.server = new S3Client({ ...base, endpoint: cfg.endpoint });
    this.signer = new S3Client({ ...base, endpoint: cfg.publicEndpoint ?? cfg.endpoint });
  }

  private bucket(kind: BucketKind) {
    return this.cfg.buckets[kind];
  }

  async createSignedUpload(input: { bucket: BucketKind; key: string; contentType: string; contentLength: number }): Promise<SignedUpload> {
    const ttl = this.cfg.signedUrlTtlSeconds;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket(input.bucket),
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    });
    const url = await getSignedUrl(this.signer, cmd, { expiresIn: ttl, signableHeaders: new Set(["content-type", "content-length"]) });
    return {
      url,
      method: "PUT",
      headers: { "content-type": input.contentType, "content-length": String(input.contentLength) },
      key: input.key,
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  }

  async createSignedDownload(input: { bucket: BucketKind; key: string; ttlSeconds?: number; downloadName?: string }) {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket(input.bucket),
      Key: input.key,
      ResponseContentDisposition: input.downloadName ? `attachment; filename="${input.downloadName.replace(/"/g, "")}"` : undefined,
    });
    return getSignedUrl(this.signer, cmd, { expiresIn: input.ttlSeconds ?? this.cfg.signedUrlTtlSeconds });
  }

  publicUrl(key: string) {
    const base = (this.cfg.publicEndpoint ?? this.cfg.endpoint ?? "").replace(/\/$/, "");
    const path = key.split("/").map(encodeURIComponent).join("/");
    return this.cfg.forcePathStyle ? `${base}/${this.bucket("public")}/${path}` : `${base}/${path}`;
  }

  async putObject(input: { bucket: BucketKind; key: string; body: Uint8Array; contentType: string }) {
    await this.server.send(
      new PutObjectCommand({ Bucket: this.bucket(input.bucket), Key: input.key, Body: input.body, ContentType: input.contentType }),
    );
  }

  async deleteObject(input: { bucket: BucketKind; key: string }) {
    await this.server.send(new DeleteObjectCommand({ Bucket: this.bucket(input.bucket), Key: input.key }));
  }

  async headObject(input: { bucket: BucketKind; key: string }) {
    try {
      const r = await this.server.send(new HeadObjectCommand({ Bucket: this.bucket(input.bucket), Key: input.key }));
      return { size: Number(r.ContentLength ?? 0), contentType: r.ContentType ?? null };
    } catch (e) {
      if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
      throw e;
    }
  }

  async ping() {
    try {
      await this.server.send(new HeadBucketCommand({ Bucket: this.bucket("public") }));
      return true;
    } catch {
      return false;
    }
  }
}
