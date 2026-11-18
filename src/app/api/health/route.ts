/** Liveness for docker compose / hosting healthchecks (notes-for-backend §4). No DB access. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", commit: process.env.GIT_COMMIT_SHA ?? null });
}
