import { storageProvider } from "@/lib/providers/storage";
import { AutoStorageProvider } from "@/lib/providers/storage/auto";
import { LocalStorageProvider, assertSafeKey, contentTypeForKey } from "@/lib/providers/storage/local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public-bucket files for the local / auto storage providers (dev + owner preview, M1).
 * Public data by definition (product images, banners): no session needed. Private-bucket files
 * are never served here. With the s3 provider images are served by the bucket/CDN and this route
 * answers 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.join("/");
  try {
    assertSafeKey(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const p = storageProvider();
  const local = p instanceof AutoStorageProvider ? p.local : p instanceof LocalStorageProvider ? p : null;
  if (!local) return new Response("Not found", { status: 404 });
  const body = await local.readPublic(key);
  if (body) {
    return new Response(Buffer.from(body), {
      headers: {
        "content-type": contentTypeForKey(key),
        "cache-control": "public, max-age=86400",
        "x-content-type-options": "nosniff",
        // SVG illustrations: never run scripts even when opened directly
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      },
    });
  }
  const remote = p instanceof AutoStorageProvider ? p.remotePublicUrl(key) : null;
  if (remote) return Response.redirect(remote, 302);
  return new Response("Not found", { status: 404 });
}
