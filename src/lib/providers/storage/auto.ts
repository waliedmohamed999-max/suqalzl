/**
 * "auto" StorageProvider (dev / preview): S3 when it answers, local disk otherwise (M1 requirement:
 * images keep working on the owner's Mac even if SeaweedFS is not running).
 * - Writes go to S3 if a ping succeeded in the last HEALTH_TTL_MS, else to local disk.
 * - publicUrl() is ALWAYS /media/<key>: that route serves the local file when it exists and
 *   redirects to the S3 public URL otherwise, so a file written while S3 was down (or up) keeps
 *   working after S3 comes back (or goes away).
 * - In production env() forces "s3" (see storageProvider()).
 */
import type { BucketKind, SignedUpload, StorageProvider } from "./index";
import type { LocalStorageProvider } from "./local";

const HEALTH_TTL_MS = 30_000;
const PING_TIMEOUT_MS = 1_500;

export class AutoStorageProvider implements StorageProvider {
  readonly name = "auto";
  private health: { ok: boolean; at: number } | null = null;

  constructor(
    readonly s3: StorageProvider | null,
    readonly local: LocalStorageProvider,
  ) {}

  async s3Healthy(): Promise<boolean> {
    if (!this.s3) return false;
    if (this.health && Date.now() - this.health.at < HEALTH_TTL_MS) return this.health.ok;
    const ok = await Promise.race([
      this.s3.ping().catch(() => false),
      new Promise<boolean>((r) => setTimeout(() => r(false), PING_TIMEOUT_MS)),
    ]);
    this.health = { ok, at: Date.now() };
    return ok;
  }
  private async writer(): Promise<StorageProvider> {
    return (await this.s3Healthy()) ? this.s3! : this.local;
  }

  async createSignedUpload(input: { bucket: BucketKind; key: string; contentType: string; contentLength: number }) {
    return (await this.writer()).createSignedUpload(input) as Promise<SignedUpload>;
  }
  async createSignedDownload(input: { bucket: BucketKind; key: string; ttlSeconds?: number; downloadName?: string }) {
    return (await this.writer()).createSignedDownload(input);
  }
  publicUrl(key: string) {
    return this.local.publicUrl(key);
  }
  /** where /media/<key> redirects when the file is not on local disk */
  remotePublicUrl(key: string): string | null {
    return this.s3 ? this.s3.publicUrl(key) : null;
  }
  async putObject(input: { bucket: BucketKind; key: string; body: Uint8Array; contentType: string }) {
    return (await this.writer()).putObject(input);
  }
  async deleteObject(input: { bucket: BucketKind; key: string }) {
    await this.local.deleteObject(input);
    if (await this.s3Healthy()) await this.s3!.deleteObject(input);
  }
  async headObject(input: { bucket: BucketKind; key: string }) {
    const local = await this.local.headObject(input);
    if (local) return local;
    return (await this.s3Healthy()) ? this.s3!.headObject(input) : null;
  }
  async ping() {
    return (await this.s3Healthy()) || (await this.local.ping());
  }
}
