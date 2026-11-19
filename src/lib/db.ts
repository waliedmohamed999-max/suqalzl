/**
 * Database access (SPEC §4 "RLS — القرار النهائي", D34, P1-00).
 *
 * - The runtime client connects as the APP role (DATABASE_URL): NOBYPASSRLS, not owner.
 * - EVERY query runs through withCtx(ctx, fn): one transaction that first sets
 *   app.role / app.vendor_id / app.user_id with set_config(..., true) (= SET LOCAL, cleared at
 *   COMMIT/ROLLBACK, safe with transaction-mode poolers). Without a context RLS returns nothing.
 * - The context is built ONLY from the server session (src/lib/auth), never from body/query.
 * - asSystem(tx, ctx, fn): narrow, explicit elevation inside the same transaction. Every call site
 *   is a reviewed "privileged step" (grep asSystem( in review).
 * - NEVER call an external provider (payment, SMS, e-mail, storage) inside withCtx (SPEC §9):
 *   the transaction holds a pooled connection for its whole duration.
 * - Secrets are omitted globally (backend.md 5.6-1); ask for them explicitly with
 *   `omit: { floorPrice: false }` in the one service that needs them.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const GLOBAL_OMIT = {
  variantNegotiationSettings: { floorPrice: true, autoAcceptPrice: true },
  user: { passwordHash: true },
  // D36-6: legal/bank/address data of a store is never returned unless a service asks for it
  // explicitly (`omit: { legalName: false }` in the vendor's own profile or the admin review).
  // Public pages use PublicVendorDTO (src/features/vendors/dto.ts).
  vendor: {
    iban: true,
    legalName: true,
    crNumber: true,
    freelanceDocNumber: true,
    vatNumber: true,
    bankName: true,
    accountHolderName: true,
    pickupAddress: true,
  },
} as const;

function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    connectionTimeoutMillis: Number(process.env.DB_POOL_TIMEOUT_MS ?? 10_000),
  });
  return new PrismaClient({ adapter, omit: GLOBAL_OMIT });
}

export type Db = ReturnType<typeof create>;
const g = globalThis as unknown as { __suqalzlDb?: Db };

/** Raw client. Do not query with it directly in app code: use withCtx. */
export function getDb(): Db {
  return (g.__suqalzlDb ??= create());
}

export async function disconnectDb() {
  if (g.__suqalzlDb) {
    await g.__suqalzlDb.$disconnect();
    g.__suqalzlDb = undefined;
  }
}

export type Ctx =
  | { kind: "vendor"; userId: string; vendorId: string }
  | { kind: "customer"; userId: string }
  | { kind: "admin"; userId: string }
  | { kind: "system"; reason: string; userId?: string }
  | { kind: "public" };

export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

export interface TxOptions {
  isolationLevel?: "ReadCommitted" | "RepeatableRead" | "Serializable";
  timeout?: number;
  maxWait?: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ctxVars(ctx: Ctx): { role: string; vendorId: string; userId: string } {
  const vendorId = ctx.kind === "vendor" ? ctx.vendorId : "";
  const userId = "userId" in ctx && ctx.userId ? ctx.userId : "";
  if (vendorId && !UUID.test(vendorId)) throw new Error("invalid vendorId in context");
  if (userId && !UUID.test(userId)) throw new Error("invalid userId in context");
  return { role: ctx.kind, vendorId, userId };
}

export async function withCtx<T>(ctx: Ctx, fn: (tx: Tx) => Promise<T>, opts: TxOptions = {}): Promise<T> {
  const { role, vendorId, userId } = ctxVars(ctx);
  return getDb().$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.role', ${role}, true),
                                  set_config('app.vendor_id', ${vendorId}, true),
                                  set_config('app.user_id', ${userId}, true)`;
      return fn(tx);
    },
    { maxWait: opts.maxWait ?? 10_000, timeout: opts.timeout ?? 15_000, isolationLevel: opts.isolationLevel },
  );
}

/**
 * Elevate to the `system` role for one step, then restore the caller context.
 * app.user_id stays the caller (audit/price-history attribution).
 *
 * Error path (devops review P1-8): if fn() failed because of a database error, Postgres has already
 * aborted the transaction, so the restoring set_config fails too ("current transaction is aborted").
 * That secondary error must never replace the ORIGINAL one: the restore is attempted (it matters
 * when fn threw a plain JS error and the caller catches it and keeps using tx) and its own failure
 * is swallowed — an aborted transaction can only roll back, so nothing can run as `system` anymore.
 */
export async function asSystem<T>(tx: Tx, ctx: Ctx, fn: () => Promise<T>): Promise<T> {
  await tx.$executeRaw`SELECT set_config('app.role', 'system', true)`;
  let result: T;
  try {
    result = await fn();
  } catch (original) {
    await tx.$executeRaw`SELECT set_config('app.role', ${ctx.kind}, true)`.catch(() => {});
    throw original;
  }
  await tx.$executeRaw`SELECT set_config('app.role', ${ctx.kind}, true)`;
  return result;
}

/** Same message whether the row is missing or belongs to someone else (no existence oracle). */
export class NotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor() {
    super("NOT_FOUND");
  }
}
export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor() {
    super("FORBIDDEN");
  }
}
