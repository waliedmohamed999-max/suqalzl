import "server-only";
import { asSystem, type Ctx, type Tx } from "@/lib/db";
import { bnplLine, configuredBnplProviders } from "@/lib/bnpl";
import { getSetting } from "@/lib/settings";
import type { BnplLineDTO } from "@/features/catalog/schema";

/**
 * D32 line builder for one request: reads Setting `bnpl` once (private setting -> system step,
 * read only) and returns a function total -> BnplLineDTO | null.
 */
export async function bnplBuilder(tx: Tx, ctx: Ctx): Promise<(total: number) => BnplLineDTO | null> {
  const providers = configuredBnplProviders();
  if (providers.length === 0) return () => null;
  const cfg = await asSystem(tx, ctx, () => getSetting(tx, "bnpl"));
  return (total) => bnplLine(total, cfg, providers);
}
