/**
 * PaymentProvider — STRUCTURE ONLY in P1-01 (D14: Moyasar, Tabby, Tamara in sandbox from P2-03 / P5-01).
 * Contract decided in backend.md §3–§4 and SPEC 6.2:
 * - amounts in halalas + currency "SAR"; our Payment.id is Moyasar's given_id (idempotent create)
 * - webhooks: verify (secret_token constant-time | Tabby header + IP allowlist | Tamara JWT HS256),
 *   store in WebhookEvent, answer 200, process in a job, and ALWAYS re-fetch the payment from the
 *   provider with the secret key before any state change
 * - "paid" for BNPL = verified authorisation; capture is claimed atomically (PaymentTransaction)
 * - metadata: orderId, orderNumber, env — never personal data
 */
import type { PaymentGateway, PaymentMethod } from "@/generated/prisma/enums";

export type ProviderPaymentStatus = "initiated" | "authorized" | "paid" | "failed" | "voided" | "refunded" | "partially_refunded" | "expired";

export interface CreatePaymentInput {
  paymentId: string; // our UUID (given_id / reference_id)
  orderId: string;
  orderNumber: string;
  amount: number; // halalas
  method: PaymentMethod;
  callbackUrl: string;
  /** BNPL providers need buyer/order data: built by a dedicated minimal DTO (backend.md 4.3-7) */
  bnpl?: Record<string, unknown>;
}

export interface ProviderPayment {
  gatewayRef: string;
  status: ProviderPaymentStatus;
  amount: number;
  currency: "SAR";
  metadataOrderId: string | null;
  feeNet: number | null;
  feeVat: number | null;
  raw: unknown;
}

export interface VerifiedWebhook {
  eventId: string;
  type: string;
  gatewayRef: string | null;
  signatureValid: boolean;
  payload: unknown;
}

export interface PaymentProvider {
  readonly gateway: PaymentGateway;
  supports(method: PaymentMethod): boolean;
  /** Returns what the browser needs (form config / redirect URL). */
  createPayment(input: CreatePaymentInput): Promise<{ gatewayRef: string | null; redirectUrl: string | null; clientConfig: unknown }>;
  fetchPayment(gatewayRef: string): Promise<ProviderPayment>;
  capture(input: { gatewayRef: string; amount: number; idempotencyKey: string }): Promise<ProviderPayment>;
  refund(input: { gatewayRef: string; amount: number; idempotencyKey: string; reason?: string }): Promise<ProviderPayment>;
  void(input: { gatewayRef: string; idempotencyKey: string }): Promise<ProviderPayment>;
  /** Verify authenticity only; never trust the body for state — re-fetch with fetchPayment(). */
  verifyWebhook(req: Request, rawBody: string): Promise<VerifiedWebhook>;
}

export class PaymentNotConfiguredError extends Error {
  readonly code = "PAYMENT_NOT_CONFIGURED";
  constructor(gateway: string) {
    super(`payment provider ${gateway} is implemented in P2-03/P5-01`);
  }
}

/** Resolved per method in P2-03. Until then every call fails loudly (no silent fake payments). */
export function paymentProviderFor(method: PaymentMethod): PaymentProvider {
  throw new PaymentNotConfiguredError(method === "TABBY" ? "TABBY" : method === "TAMARA" ? "TAMARA" : "MOYASAR");
}
