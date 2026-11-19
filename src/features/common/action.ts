import { ZodError } from "zod";
import { ForbiddenError, NotFoundError } from "@/lib/db";
import { PermissionDeniedError, UnauthorizedError } from "@/lib/permissions";
import { UploadRejectedError } from "@/lib/providers/storage";
import { ERROR_CODES, type ActionError, type ErrorCode } from "./schema";

/** Any service error carrying a stable `code` from ERROR_CODES (CartError, CatalogAdminError...). */
export class CodedError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

const KNOWN = new Set<string>(ERROR_CODES);

/** Maps a thrown error to ActionResult's error branch. Unknown errors: INTERNAL, logged without details. */
export function toActionError(e: unknown): ActionError {
  if (e instanceof ZodError)
    return {
      ok: false,
      code: "VALIDATION",
      issues: e.issues.slice(0, 50).map((i) => ({ path: i.path.join("."), code: i.code })),
    };
  if (e instanceof UnauthorizedError) return { ok: false, code: "UNAUTHORIZED" };
  if (e instanceof PermissionDeniedError || e instanceof ForbiddenError) return { ok: false, code: "FORBIDDEN" };
  if (e instanceof NotFoundError) return { ok: false, code: "NOT_FOUND" };
  if (e instanceof UploadRejectedError)
    return { ok: false, code: e.message === "UPLOAD_REJECTED_SIZE" ? "UPLOAD_REJECTED_SIZE" : "UPLOAD_REJECTED_TYPE" };
  const code = (e as { code?: unknown } | null)?.code;
  if (e instanceof Error && typeof code === "string" && KNOWN.has(code) && !("clientVersion" in e))
    return { ok: false, code: code as ErrorCode };
  console.error("[action] unhandled", e instanceof Error ? e.message : e);
  return { ok: false, code: "INTERNAL" };
}
