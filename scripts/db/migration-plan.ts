/**
 * Baseline migration order (docs/decisions/backend.md §6, adapted to generic Postgres after P1-00):
 * RLS is created in the SAME migration as each table (SPEC §2 DB). 0009 only asserts it.
 */
export interface MigrationStep {
  name: string;
  description: string;
  models: string[];
}

export const MIGRATION_PLAN: MigrationStep[] = [
  {
    name: "0001_init_core",
    description: "RLS helpers (schema app), users + auth, cities, categories, vendors, settings, audit, jobs, CMS",
    models: [
      "User",
      "Session",
      "OtpChallenge",
      "TrustedDevice",
      "RateLimitBucket",
      "MarketingConsent",
      "City",
      "Category",
      "Vendor",
      "VendorDocument",
      "VendorMember",
      "VendorCategory",
      "VendorBankChangeRequest",
      "Setting",
      "AuditLog",
      "Notification",
      "Redirect",
      "Page",
      "Banner",
      "HomeSection",
      "Job",
    ],
  },
  {
    name: "0002_catalog_inventory",
    description: "products, options, variants, bundles, stock reservations (C3), wishlists, revisions (M5)",
    models: [
      "Product",
      "ProductRevision",
      "ProductImage",
      "ProductOption",
      "OptionValue",
      "ProductVariant",
      "Bundle",
      "BundleItem",
      "StockReservation",
      "Wishlist",
    ],
  },
  {
    name: "0003_orders_payments",
    description:
      "carts, addresses, coupons, orders (H12-H14), payments (C4, C5), returns, reviews, tax invoices (D13), sequences (M1)",
    models: [
      "Address",
      "Coupon",
      "Cart",
      "CartItem",
      "Order",
      "SubOrder",
      "OrderItem",
      "OrderStatusHistory",
      "Payment",
      "PaymentTransaction",
      "WebhookEvent",
      "Return",
      "Review",
      "TaxInvoice",
      "TaxInvoiceLine",
    ],
  },
  {
    name: "0004_shipping",
    description: "shipping zones, manual shipments (D17, H3)",
    models: ["ShippingZone", "ShippingZoneCity", "Shipment", "ShipmentEvent"],
  },
  {
    name: "0005_ledger_payouts",
    description: "wallet ledger append-only (C7), payouts, vendor purchase invoices (D11)",
    models: ["PayoutBatch", "Payout", "WalletTransaction", "VendorPurchaseInvoice"],
  },
  {
    name: "0006_price_history",
    description: "price history written by trigger (H5)",
    models: ["PriceHistory"],
  },
  {
    name: "0007_deals",
    description: "deals, deal variants + exclusion constraint (H6), redemptions (H7)",
    models: ["Deal", "DealVariant", "DealRedemption"],
  },
  {
    name: "0008_negotiation",
    description: "negotiation settings (C6), requests, threads (H9), offers (H10), price locks (H11), moderation (M8)",
    models: [
      "NegotiationSettings",
      "VariantNegotiationSettings",
      "PriceRequest",
      "PriceRequestRecipient",
      "NegotiationThread",
      "PriceOffer",
      "PriceLock",
      "ModerationFlag",
    ],
  },
  {
    name: "0009_security_hardening",
    description: "asserts RLS ENABLE+FORCE on every table, runtime role without TRUNCATE, no unsafe defaults",
    models: [],
  },
  {
    name: "0010_realtime_outbox",
    description: "realtime outbox + publish_event/read_events (P1-00, SPEC 6.8)",
    models: ["RealtimeEvent"],
  },
  // ---- after the baseline (P1-01d). The generator rewrites 0001-0010 byte-identically; verify with
  // `git diff --exit-code prisma/migrations/000*` before committing.
  {
    name: "0011_session_revocation_cron_leases",
    description:
      "QA-B3/B4 session revocation triggers + session.revoked NOTIFY, resync bounds, cron leases + heartbeat (devops P1-5/6)",
    models: ["CronLease"],
  },
];
