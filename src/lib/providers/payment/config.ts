/**
 * Which payment providers are configured in THIS environment (keys present). Sandbox only until P8
 * (D14): a live key outside APP_ENV=production is refused by assertSandboxKey().
 */
import type { PaymentMethod } from "@/generated/prisma/enums";

type Env = Record<string, string | undefined>;

export const moyasarConfigured = (env: Env = process.env) =>
  !!(env.MOYASAR_SECRET_KEY && env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY && env.MOYASAR_WEBHOOK_SECRET);
export const tabbyConfigured = (env: Env = process.env) =>
  !!(env.TABBY_SECRET_KEY && env.TABBY_MERCHANT_CODE && env.TABBY_WEBHOOK_SECRET);
export const tamaraConfigured = (env: Env = process.env) => !!(env.TAMARA_API_TOKEN && env.TAMARA_NOTIFICATION_TOKEN);

export function methodConfigured(method: PaymentMethod, env: Env = process.env): boolean {
  if (method === "TABBY") return tabbyConfigured(env);
  if (method === "TAMARA") return tamaraConfigured(env);
  return moyasarConfigured(env);
}

export const anyPaymentConfigured = (env: Env = process.env) =>
  moyasarConfigured(env) || tabbyConfigured(env) || tamaraConfigured(env);

export class LivePaymentKeyError extends Error {
  readonly code = "PAYMENT_UNAVAILABLE";
  constructor(name: string) {
    super(`${name} looks like a LIVE key; live payment keys are allowed only when APP_ENV=production (D14)`);
  }
}

/** sk_live_ / pk_live_ (Moyasar, Tabby) outside production -> refuse to start the payment. */
export function assertSandboxKey(name: string, value: string, env: Env = process.env) {
  if (env.APP_ENV === "production") return;
  if (/^(sk|pk)_live_/.test(value)) throw new LivePaymentKeyError(name);
}
