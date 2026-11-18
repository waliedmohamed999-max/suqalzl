import { getDb } from "@/lib/db";
import { storageProvider } from "@/lib/providers/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness (notes-for-backend §4): database + storage. 503 if either is down. No details leaked. */
export async function GET() {
  const [db, storage] = await Promise.all([
    getDb().$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    (async () => {
      try {
        return await storageProvider().ping();
      } catch {
        return false;
      }
    })(),
  ]);
  const ok = db && storage;
  return Response.json({ status: ok ? "ready" : "not-ready", db, storage }, { status: ok ? 200 : 503 });
}
