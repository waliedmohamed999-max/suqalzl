import type { Db } from "./db";
import { db } from "./db";

/**
 * Request context. Built ONLY from the server session (never from request body/query).
 * 'system' = jobs/cron/checkout internals; 'admin' = staff panel.
 */
export type Ctx =
  | { kind: "vendor"; userId: string; vendorId: string }
  | { kind: "customer"; userId: string }
  | { kind: "admin"; userId: string }
  | { kind: "system" }
  | { kind: "public" };

export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

export interface TxOptions {
  isolationLevel?: "ReadCommitted" | "RepeatableRead" | "Serializable";
  timeout?: number;
  maxWait?: number;
}

/**
 * Runs fn inside ONE transaction with the RLS context set via set_config(..., is_local = true),
 * i.e. SET LOCAL: it disappears at COMMIT/ROLLBACK, so a pooled connection never carries
 * another request's context (tested in tests/isolation.rls.test.ts).
 */
export async function withCtx<T>(ctx: Ctx, fn: (tx: Tx) => Promise<T>, opts: TxOptions = {}): Promise<T> {
  const role = ctx.kind;
  const vendorId = ctx.kind === "vendor" ? ctx.vendorId : "";
  const userId = "userId" in ctx ? ctx.userId : "";
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.role', ${role}, true),
                                  set_config('app.vendor_id', ${vendorId}, true),
                                  set_config('app.user_id', ${userId}, true)`;
      return fn(tx);
    },
    { maxWait: opts.maxWait ?? 10_000, timeout: opts.timeout ?? 15_000, isolationLevel: opts.isolationLevel },
  );
}

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor() {
    super("NOT_FOUND"); // same message whether the row is missing or belongs to someone else
  }
}
export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor() {
    super("FORBIDDEN");
  }
}

/**
 * Narrow, explicit elevation inside an existing transaction (fan-out to recipients, status changes
 * the actor's own policy does not allow, stock reservation). Restores the caller context after.
 * Every call site is an audited "privileged step"; grep for asSystem( in review.
 */
export async function asSystem<T>(tx: Tx, ctx: Ctx, fn: () => Promise<T>): Promise<T> {
  await tx.$executeRaw`SELECT set_config('app.role', 'system', true)`;
  try {
    return await fn();
  } finally {
    await tx.$executeRaw`SELECT set_config('app.role', ${ctx.kind}, true)`;
  }
}
