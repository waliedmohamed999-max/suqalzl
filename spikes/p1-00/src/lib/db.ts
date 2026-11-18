import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Runtime Prisma client. Connects as suq_app (RLS applies). Secrets are omitted globally
 * (backend.md 5.6-1): a plain findMany never returns them; only the negotiation service asks for
 * floorPrice explicitly with `omit: { floorPrice: false }`.
 */
function create() {
  const adapter = new PrismaPg({
    connectionString: process.env.APP_DATABASE_URL!,
    max: Number(process.env.APP_DB_POOL_MAX ?? 20),
  });
  return new PrismaClient({
    adapter,
    omit: {
      variantNegotiationSettings: { floorPrice: true, autoAcceptPrice: true },
      vendor: { iban: true },
    },
  });
}

export type Db = ReturnType<typeof create>;
const g = globalThis as unknown as { __spikeDb?: Db };
export const db: Db = g.__spikeDb ?? (g.__spikeDb = create());
