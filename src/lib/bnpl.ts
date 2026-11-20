/**
 * Installments line (D32, SPEC 6.2-7/13). Pure: the server computes it, the UI only renders it.
 * - Shown to EVERY visitor on the product page and the cart, worded without promising approval
 *   (the provider approves at checkout). Providers listed = the ones configured in this
 *   environment (env keys present); none configured -> no line at all.
 * - The per-instalment amount is shown only within [minAmount, maxAmount] of the provider cap
 *   (Setting `bnpl`, default = SAMA's 10,000 SAR BNPL ceiling, to be confirmed with Tabby/Tamara
 *   in P8). Above the cap: the line stays, without a number (D32: "بدون رقم قسط").
 * - amount = ceil(total / count): the LARGEST instalment, so the number never under-promises.
 */
import { tabbyConfigured, tamaraConfigured } from "./providers/payment/config";

export type BnplProvider = "TABBY" | "TAMARA";
export interface BnplConfig {
  installments: number;
  minAmount: number;
  maxAmount: number;
}
export interface BnplLine {
  providers: BnplProvider[];
  installment: { count: number; amount: number } | null;
}

export function bnplLine(total: number, cfg: BnplConfig, providers: readonly BnplProvider[]): BnplLine | null {
  if (!Number.isSafeInteger(total) || total < 0) throw new TypeError("total must be integer halalas");
  if (providers.length === 0) return null;
  const n = cfg.installments;
  const inRange = total > 0 && total >= cfg.minAmount && total <= cfg.maxAmount && n > 0;
  return {
    providers: [...providers],
    installment: inRange ? { count: n, amount: Math.ceil(total / n) } : null,
  };
}

/** Providers whose server keys are set (the line must not advertise a provider we cannot use). */
export function configuredBnplProviders(env: Record<string, string | undefined> = process.env): BnplProvider[] {
  const out: BnplProvider[] = [];
  if (tabbyConfigured(env)) out.push("TABBY");
  if (tamaraConfigured(env)) out.push("TAMARA");
  return out;
}
