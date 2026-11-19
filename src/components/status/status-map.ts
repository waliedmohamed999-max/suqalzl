import type { Tone } from "@/components/ui/badge";

/**
 * Domain status → tone (tokens.md 2.5). Labels live in messages/*.json under
 * status.<entity>.<STATE>. `solid` marks the final/strong states drawn as solid badges.
 */
type Entry = { tone: Tone; solid?: boolean };

export const STATUS_MAP = {
  subOrder: {
    PENDING_PAYMENT: { tone: "warning" },
    NEW: { tone: "info" },
    PREPARING: { tone: "accent" },
    READY_TO_SHIP: { tone: "accent" },
    SHIPPED: { tone: "info" },
    DELIVERED: { tone: "success" },
    COMPLETED: { tone: "success", solid: true },
    CANCELLED: { tone: "neutral" },
    RETURN_REQUESTED: { tone: "warning" },
    RETURNED: { tone: "neutral" },
  },
  order: {
    PENDING_PAYMENT: { tone: "warning" },
    PAID: { tone: "info" },
    PROCESSING: { tone: "accent" },
    PARTIALLY_SHIPPED: { tone: "info" },
    SHIPPED: { tone: "info" },
    DELIVERED: { tone: "success" },
    COMPLETED: { tone: "success" },
    PARTIALLY_CANCELLED: { tone: "warning" },
    CANCELLED: { tone: "neutral" },
    PAID_NEEDS_REVIEW: { tone: "warning" },
  },
  payment: {
    PENDING: { tone: "warning" },
    INITIATED: { tone: "warning" },
    AUTHORIZED: { tone: "info" },
    PAID: { tone: "success" },
    VOIDED: { tone: "neutral" },
    FAILED: { tone: "danger" },
    REFUNDED: { tone: "neutral" },
    PARTIALLY_REFUNDED: { tone: "neutral" },
  },
  return: {
    REQUESTED: { tone: "warning" },
    APPROVED: { tone: "info" },
    REJECTED: { tone: "danger" },
    RECEIVED: { tone: "info" },
    REFUNDED: { tone: "success" },
  },
  priceRequest: {
    OPEN: { tone: "info" },
    HAS_OFFERS: { tone: "accent" },
    ACCEPTED: { tone: "success" },
    CONVERTED: { tone: "success", solid: true },
    EXPIRED: { tone: "neutral" },
    CANCELLED: { tone: "neutral" },
  },
  // REJECTED is neutral on purpose: declining is normal in bargaining (tokens.md 2.5).
  offer: {
    PENDING: { tone: "warning" },
    COUNTERED: { tone: "info" },
    ACCEPTED: { tone: "success" },
    REJECTED: { tone: "neutral" },
    EXPIRED: { tone: "neutral" },
    WITHDRAWN: { tone: "neutral" },
  },
  priceLock: {
    ACTIVE: { tone: "accent" },
    USED: { tone: "success" },
    EXPIRED: { tone: "neutral" },
    CANCELLED: { tone: "neutral" },
  },
  deal: {
    DRAFT: { tone: "neutral" },
    PENDING: { tone: "warning" },
    APPROVED: { tone: "info" },
    LIVE: { tone: "live" },
    ENDED: { tone: "neutral" },
    REJECTED: { tone: "danger" },
  },
  product: {
    DRAFT: { tone: "neutral" },
    PENDING: { tone: "warning" },
    PUBLISHED: { tone: "success" },
    REJECTED: { tone: "danger" },
    ARCHIVED: { tone: "neutral" },
  },
  vendor: {
    PENDING: { tone: "warning" },
    APPROVED: { tone: "success" },
    REJECTED: { tone: "danger" },
    SUSPENDED: { tone: "danger" },
  },
  wallet: {
    PENDING: { tone: "warning" },
    AVAILABLE: { tone: "success" },
    PAID: { tone: "neutral" },
  },
  payout: {
    DRAFT: { tone: "neutral" },
    APPROVED: { tone: "info" },
    PAID: { tone: "success" },
    CANCELLED: { tone: "neutral" },
  },
  review: {
    PENDING: { tone: "warning" },
    APPROVED: { tone: "success" },
    HIDDEN: { tone: "neutral" },
  },
} as const satisfies Record<string, Record<string, Entry>>;

export type StatusEntity = keyof typeof STATUS_MAP;
export type StatusOf<E extends StatusEntity> = keyof (typeof STATUS_MAP)[E] & string;

export function statusTone<E extends StatusEntity>(entity: E, status: StatusOf<E>): Entry {
  return (STATUS_MAP[entity] as Record<string, Entry>)[status] ?? { tone: "neutral" };
}
