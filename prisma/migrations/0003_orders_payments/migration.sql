-- 0003_orders_payments
-- carts, addresses, coupons, orders (H12-H14), payments (C4, C5), returns, reviews, tax invoices (D13), sequences (M1)
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0003_orders_payments.sql

-- ======================================================================= part 0: hand-written (before tables)
-- M1: gap-tolerant, race-free document numbers (never max()+1).
CREATE SEQUENCE "order_number_seq" START 100001;
CREATE SEQUENCE "tax_invoice_number_seq" START 1;
-- ICV (ZATCA invoice counter value): strictly increasing, one EGS for now (D13, P8 decides more).
CREATE SEQUENCE "tax_invoice_icv_seq" START 1;

-- ======================================================================= part 1: tables
CREATE TYPE "PaymentMethod" AS ENUM ('MADA', 'CARD', 'APPLE_PAY', 'STC_PAY', 'TABBY', 'TAMARA');
CREATE TYPE "PaymentGateway" AS ENUM ('MOYASAR', 'TABBY', 'TAMARA');
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'AUTHORIZED', 'PAID', 'FAILED', 'VOIDED', 'PARTIALLY_REFUNDED', 'REFUNDED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'PARTIALLY_CANCELLED', 'CANCELLED', 'PAID_NEEDS_REVIEW');
CREATE TYPE "SubOrderStatus" AS ENUM ('PENDING_PAYMENT', 'NEW', 'PREPARING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED');
CREATE TYPE "InvoiceType" AS ENUM ('SIMPLIFIED', 'STANDARD');
CREATE TYPE "FeeBearer" AS ENUM ('PLATFORM', 'VENDOR');
CREATE TYPE "FeeSource" AS ENUM ('GATEWAY', 'ESTIMATE');
CREATE TYPE "PriceSource" AS ENUM ('REGULAR', 'DEAL', 'NEGOTIATION');
CREATE TYPE "PaymentTransactionType" AS ENUM ('AUTHORIZE', 'CAPTURE', 'REFUND', 'VOID');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "PaymentTransactionMethod" AS ENUM ('GATEWAY', 'MANUAL_BANK_TRANSFER');
CREATE TYPE "WebhookProvider" AS ENUM ('MOYASAR', 'TABBY', 'TAMARA', 'TAQNYAT', 'META_WHATSAPP', 'RESEND');
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED');
CREATE TYPE "TaxInvoiceKind" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE');
CREATE TYPE "ZatcaStatus" AS ENUM ('PENDING', 'REPORTED', 'CLEARED', 'REJECTED');
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED', 'FREE_SHIPPING');
CREATE TYPE "CouponApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');

CREATE TABLE "addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "city_id" UUID NOT NULL,
    "district" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "building_no" TEXT,
    "postal_code" TEXT,
    "national_address_short" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "min_order" INTEGER,
    "max_discount" INTEGER,
    "vendor_id" UUID,
    "applies_to_category_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "usage_limit" INTEGER,
    "per_user_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "approval_status" "CouponApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "guest_token_hash" TEXT,
    "coupon_id" UUID,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "variant_id" UUID,
    "bundle_id" UUID,
    "qty" INTEGER NOT NULL,
    "deal_id" UUID,
    "locked_unit_price" INTEGER,
    "price_locked_until" TIMESTAMPTZ(3),
    "price_lock_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL DEFAULT ('SZ-'::text || nextval('order_number_seq'::regclass)),
    "user_id" UUID NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount_total" INTEGER NOT NULL DEFAULT 0,
    "shipping_total" INTEGER NOT NULL DEFAULT 0,
    "vat_total" INTEGER NOT NULL,
    "grand_total" INTEGER NOT NULL,
    "vat_rate_bp" INTEGER NOT NULL,
    "coupon_id" UUID,
    "coupon_code" TEXT,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "buyer_vat_number" TEXT,
    "buyer_legal_name" TEXT,
    "invoice_type" "InvoiceType" NOT NULL DEFAULT 'SIMPLIFIED',
    "placed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sub_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "vendor_id" UUID,
    "number" TEXT NOT NULL,
    "status" "SubOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "price_source" "PriceSource" NOT NULL DEFAULT 'REGULAR',
    "items_gross" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "platform_discount_share" INTEGER NOT NULL DEFAULT 0,
    "vendor_discount_share" INTEGER NOT NULL DEFAULT 0,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "vat_amount" INTEGER NOT NULL,
    "vat_rate_bp" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "commission_rate" INTEGER NOT NULL DEFAULT 0,
    "commission_base_net" INTEGER NOT NULL DEFAULT 0,
    "commission_amount" INTEGER NOT NULL DEFAULT 0,
    "fee_bearer" "FeeBearer" NOT NULL DEFAULT 'PLATFORM',
    "gateway_fee_share" INTEGER NOT NULL DEFAULT 0,
    "shipping_mode" "ShippingMode" NOT NULL DEFAULT 'PLATFORM_SHIPPING',
    "shipping_net_to_vendor" INTEGER NOT NULL DEFAULT 0,
    "vendor_vat_registered" BOOLEAN NOT NULL DEFAULT false,
    "vendor_vat_number_snapshot" TEXT,
    "vendor_net" INTEGER NOT NULL DEFAULT 0,
    "vendor_vat" INTEGER NOT NULL DEFAULT 0,
    "vendor_payable" INTEGER NOT NULL DEFAULT 0,
    "shipped_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sub_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_order_id" UUID NOT NULL,
    "variant_id" UUID,
    "bundle_id" UUID,
    "product_snapshot" JSONB NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,
    "platform_discount" INTEGER NOT NULL DEFAULT 0,
    "vendor_discount" INTEGER NOT NULL DEFAULT 0,
    "net_amount" INTEGER NOT NULL,
    "vat_amount" INTEGER NOT NULL,
    "vat_rate_bp" INTEGER NOT NULL,
    "price_lock_id" UUID,
    "deal_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_order_id" UUID NOT NULL,
    "from" "SubOrderStatus",
    "to" "SubOrderStatus" NOT NULL,
    "by_user_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "gateway_ref" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "fee" INTEGER,
    "fee_net" INTEGER,
    "fee_vat" INTEGER,
    "fee_source" "FeeSource",
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "raw_payload" JSONB,
    "refunded_amount" INTEGER NOT NULL DEFAULT 0,
    "refund_fee_net" INTEGER,
    "authorized_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "settled_at" TIMESTAMPTZ(3),
    "settlement_ref" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "type" "PaymentTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "sub_order_id" UUID,
    "return_id" UUID,
    "gateway_ref" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentTransactionMethod" NOT NULL DEFAULT 'GATEWAY',
    "requested_by_user_id" UUID,
    "raw_response" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "WebhookProvider" NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "refund_amount" INTEGER NOT NULL DEFAULT 0,
    "decided_by_user_id" UUID,
    "decision_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "vendor_reply" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tax_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "kind" "TaxInvoiceKind" NOT NULL DEFAULT 'INVOICE',
    "type" "InvoiceType" NOT NULL DEFAULT 'SIMPLIFIED',
    "number" TEXT NOT NULL DEFAULT ('INV-'::text || lpad(nextval('tax_invoice_number_seq'::regclass)::text, 8, '0')),
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "icv" BIGINT NOT NULL DEFAULT nextval('tax_invoice_icv_seq'::regclass),
    "previous_invoice_hash" TEXT,
    "invoice_hash" TEXT,
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seller_name" TEXT NOT NULL,
    "seller_vat_number" TEXT NOT NULL,
    "buyer_name" TEXT,
    "buyer_vat_number" TEXT,
    "net_total" INTEGER NOT NULL,
    "vat_total" INTEGER NOT NULL,
    "gross_total" INTEGER NOT NULL,
    "original_invoice_id" UUID,
    "return_id" UUID,
    "reason" TEXT,
    "qr_tlv" TEXT NOT NULL,
    "pdf_path" TEXT,
    "xml_path" TEXT,
    "zatca_status" "ZatcaStatus" NOT NULL DEFAULT 'PENDING',
    "zatca_response" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tax_invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "order_item_id" UUID,
    "line_no" INTEGER NOT NULL,
    "description_ar" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "net_amount" INTEGER NOT NULL,
    "vat_rate_bp" INTEGER NOT NULL,
    "vat_amount" INTEGER NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    CONSTRAINT "tax_invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_vendor_id_is_active_idx" ON "coupons"("vendor_id", "is_active");

CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
CREATE UNIQUE INDEX "carts_guest_token_hash_key" ON "carts"("guest_token_hash");

CREATE UNIQUE INDEX "cart_items_price_lock_id_key" ON "cart_items"("price_lock_id");
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");
CREATE INDEX "orders_user_id_placed_at_idx" ON "orders"("user_id", "placed_at" DESC);
CREATE INDEX "orders_status_placed_at_idx" ON "orders"("status", "placed_at");

CREATE UNIQUE INDEX "sub_orders_number_key" ON "sub_orders"("number");
CREATE INDEX "sub_orders_vendor_id_status_created_at_idx" ON "sub_orders"("vendor_id", "status", "created_at" DESC);
CREATE INDEX "sub_orders_order_id_idx" ON "sub_orders"("order_id");
CREATE INDEX "sub_orders_status_delivered_at_idx" ON "sub_orders"("status", "delivered_at");

CREATE INDEX "order_items_sub_order_id_idx" ON "order_items"("sub_order_id");
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

CREATE INDEX "order_status_history_sub_order_id_created_at_idx" ON "order_status_history"("sub_order_id", "created_at");

CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");
CREATE UNIQUE INDEX "payments_gateway_gateway_ref_key" ON "payments"("gateway", "gateway_ref");

CREATE UNIQUE INDEX "payment_transactions_idempotency_key_key" ON "payment_transactions"("idempotency_key");
CREATE INDEX "payment_transactions_payment_id_type_idx" ON "payment_transactions"("payment_id", "type");

CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider", "event_id");

CREATE INDEX "returns_sub_order_id_idx" ON "returns"("sub_order_id");
CREATE INDEX "returns_status_created_at_idx" ON "returns"("status", "created_at");

CREATE UNIQUE INDEX "reviews_order_item_id_key" ON "reviews"("order_item_id");
CREATE INDEX "reviews_product_id_status_created_at_idx" ON "reviews"("product_id", "status", "created_at" DESC);

CREATE UNIQUE INDEX "tax_invoices_number_key" ON "tax_invoices"("number");
CREATE UNIQUE INDEX "tax_invoices_uuid_key" ON "tax_invoices"("uuid");
CREATE UNIQUE INDEX "tax_invoices_icv_key" ON "tax_invoices"("icv");
CREATE INDEX "tax_invoices_order_id_idx" ON "tax_invoices"("order_id");

CREATE UNIQUE INDEX "tax_invoice_lines_invoice_id_line_no_key" ON "tax_invoice_lines"("invoice_id", "line_no");

ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sub_order_id_fkey" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_sub_order_id_fkey" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_sub_order_id_fkey" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "returns" ADD CONSTRAINT "returns_sub_order_id_fkey" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "returns" ADD CONSTRAINT "returns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_original_invoice_id_fkey" FOREIGN KEY ("original_invoice_id") REFERENCES "tax_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tax_invoice_lines" ADD CONSTRAINT "tax_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "tax_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_invoice_lines" ADD CONSTRAINT "tax_invoice_lines_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ======================================================================= part 2: hand-written
-- ---------------------------------------------------------------- CHECKs (backend.md 5.5, H12-H14)
ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_recipient_phone" CHECK ("recipient_phone" ~ '^\+9665[0-9]{8}$');

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_code_upper" CHECK ("code" = upper("code") AND "code" ~ '^[A-Z0-9_-]{3,32}$'),
  ADD CONSTRAINT "coupons_value" CHECK (
    ("type" = 'PERCENT' AND "value" BETWEEN 1 AND 10000) OR
    ("type" = 'FIXED' AND "value" > 0) OR
    ("type" = 'FREE_SHIPPING' AND "value" = 0)),
  ADD CONSTRAINT "coupons_amounts_nonneg" CHECK (coalesce("min_order", 0) >= 0 AND coalesce("max_discount", 0) >= 0 AND "used_count" >= 0),
  ADD CONSTRAINT "coupons_window" CHECK ("ends_at" > "starts_at"),
  -- D18: an active public coupon that needs approval must have it.
  ADD CONSTRAINT "coupons_approval_before_active" CHECK (NOT "is_active" OR "approval_status" IN ('NOT_REQUIRED', 'APPROVED'));

ALTER TABLE "carts" ADD CONSTRAINT "carts_owner" CHECK ("user_id" IS NOT NULL OR "guest_token_hash" IS NOT NULL);
ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_qty_pos" CHECK ("qty" > 0),
  ADD CONSTRAINT "cart_items_one_target" CHECK (num_nonnulls("variant_id", "bundle_id") = 1),
  ADD CONSTRAINT "cart_items_locked_price_pos" CHECK ("locked_unit_price" IS NULL OR "locked_unit_price" > 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amounts_nonneg" CHECK ("subtotal" >= 0 AND "discount_total" >= 0 AND "shipping_total" >= 0 AND "vat_total" >= 0 AND "grand_total" >= 0),
  ADD CONSTRAINT "orders_grand_total" CHECK ("grand_total" = "subtotal" - "discount_total" + "shipping_total"),
  ADD CONSTRAINT "orders_vat_rate" CHECK ("vat_rate_bp" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "orders_buyer_vat" CHECK ("buyer_vat_number" IS NULL OR "buyer_vat_number" ~ '^3[0-9]{13}3$'),
  ADD CONSTRAINT "orders_standard_needs_vat" CHECK ("invoice_type" = 'SIMPLIFIED' OR "buyer_vat_number" IS NOT NULL);

ALTER TABLE "sub_orders"
  ADD CONSTRAINT "sub_orders_amounts_nonneg" CHECK (
    "items_gross" >= 0 AND "subtotal" >= 0 AND "platform_discount_share" >= 0 AND "vendor_discount_share" >= 0
    AND "shipping_fee" >= 0 AND "vat_amount" >= 0 AND "total" >= 0 AND "commission_base_net" >= 0
    AND "commission_amount" >= 0 AND "gateway_fee_share" >= 0 AND "shipping_net_to_vendor" >= 0 AND "vendor_vat" >= 0),
  ADD CONSTRAINT "sub_orders_total" CHECK ("total" = "subtotal" - "platform_discount_share" - "vendor_discount_share" + "shipping_fee"),
  ADD CONSTRAINT "sub_orders_commission_bps" CHECK ("commission_rate" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "sub_orders_vat_rate" CHECK ("vat_rate_bp" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "sub_orders_payable" CHECK ("vendor_payable" = "vendor_net" + "vendor_vat"),
  -- 6.1: platform products (vendor_id null) carry no commission and no payable
  ADD CONSTRAINT "sub_orders_platform_no_payable" CHECK ("vendor_id" IS NOT NULL OR ("commission_amount" = 0 AND "vendor_payable" = 0));

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_qty_pos" CHECK ("qty" > 0),
  ADD CONSTRAINT "order_items_one_target" CHECK (num_nonnulls("variant_id", "bundle_id") = 1),
  ADD CONSTRAINT "order_items_amounts" CHECK ("unit_price" >= 0 AND "line_total" = "unit_price" * "qty"
    AND "platform_discount" >= 0 AND "vendor_discount" >= 0 AND "net_amount" >= 0 AND "vat_amount" >= 0),
  ADD CONSTRAINT "order_items_net_vat" CHECK ("net_amount" + "vat_amount" = "line_total" - "platform_discount" - "vendor_discount");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_pos" CHECK ("amount" > 0),
  ADD CONSTRAINT "payments_currency" CHECK ("currency" = 'SAR'),
  ADD CONSTRAINT "payments_refunded" CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "amount");
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_amount_pos" CHECK ("amount" > 0);
ALTER TABLE "returns" ADD CONSTRAINT "returns_refund_nonneg" CHECK ("refund_amount" >= 0);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "tax_invoices"
  ADD CONSTRAINT "tax_invoices_totals" CHECK ("gross_total" = "net_total" + "vat_total" AND "net_total" >= 0 AND "vat_total" >= 0),
  ADD CONSTRAINT "tax_invoices_note_has_original" CHECK ("kind" = 'INVOICE' OR "original_invoice_id" IS NOT NULL),
  ADD CONSTRAINT "tax_invoices_standard_buyer" CHECK ("type" = 'SIMPLIFIED' OR "buyer_vat_number" IS NOT NULL);
ALTER TABLE "tax_invoice_lines"
  ADD CONSTRAINT "tax_invoice_lines_amounts" CHECK ("gross_amount" = "net_amount" + "vat_amount" AND "qty" > 0 AND "discount" >= 0);

-- Cron "cancel unpaid after 30 min" (6.2-5) and reconciliation (6.2-14)
CREATE INDEX "orders_pending_payment_idx" ON "orders" ("placed_at") WHERE "status" = 'PENDING_PAYMENT';
CREATE INDEX "webhook_events_unprocessed_idx" ON "webhook_events" ("received_at") WHERE "processed_at" IS NULL;
-- C4/5.1: one capture per payment (redirect + webhook race, 6.2-12)
CREATE UNIQUE INDEX "payment_transactions_one_capture" ON "payment_transactions" ("payment_id")
  WHERE "type" = 'CAPTURE' AND "status" <> 'FAILED';

-- ---------------------------------------------------------------- guards
-- Financial values are frozen at payment time (6.1). Vendors may only move status/timestamps.
CREATE FUNCTION app.guard_sub_orders() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','shipped_at','delivered_at','cancelled_at','cancel_reason','updated_at'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','shipped_at','delivered_at','cancelled_at','cancel_reason','updated_at']) THEN
    RAISE EXCEPTION 'sub-order financial columns are frozen' USING ERRCODE = '42501';
  END IF;
  -- vendors move only NEW→PREPARING→READY_TO_SHIP→SHIPPED (+ cancel from NEW/PREPARING) — 6.3.
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
       (OLD."status" = 'NEW' AND NEW."status" IN ('PREPARING', 'CANCELLED'))
    OR (OLD."status" = 'PREPARING' AND NEW."status" IN ('READY_TO_SHIP', 'CANCELLED'))
    OR (OLD."status" = 'READY_TO_SHIP' AND NEW."status" = 'SHIPPED')
    OR (OLD."status" = 'SHIPPED' AND NEW."status" = 'DELIVERED')) THEN
    RAISE EXCEPTION 'sub-order transition % -> % not allowed here', OLD."status", NEW."status" USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "sub_orders_guard" BEFORE UPDATE ON "sub_orders" FOR EACH ROW EXECUTE FUNCTION app.guard_sub_orders();

-- D13: invoices are never edited or deleted; only ZATCA integration fields may be filled later (P8).
CREATE FUNCTION app.guard_tax_invoices() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['zatca_status','zatca_response','xml_path','pdf_path'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['zatca_status','zatca_response','xml_path','pdf_path']) THEN
    RAISE EXCEPTION 'tax invoices are immutable (issue a credit/debit note)' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "tax_invoices_guard" BEFORE UPDATE ON "tax_invoices" FOR EACH ROW EXECUTE FUNCTION app.guard_tax_invoices();
CREATE TRIGGER "tax_invoices_no_delete" BEFORE DELETE ON "tax_invoices" FOR EACH ROW EXECUTE FUNCTION app.forbid_delete();
CREATE TRIGGER "tax_invoice_lines_no_update" BEFORE UPDATE ON "tax_invoice_lines" FOR EACH ROW EXECUTE FUNCTION app.forbid_update();
CREATE TRIGGER "tax_invoice_lines_no_delete" BEFORE DELETE ON "tax_invoice_lines" FOR EACH ROW EXECUTE FUNCTION app.forbid_delete();

-- ---------------------------------------------------------------- RLS
SELECT app.secure_table('addresses', true);
SELECT app.secure_table('coupons');
SELECT app.secure_table('carts', true);
SELECT app.secure_table('cart_items', true);
SELECT app.secure_table('orders');
SELECT app.secure_table('sub_orders');
SELECT app.secure_table('order_items');
SELECT app.secure_table('order_status_history');
SELECT app.secure_table('payments');
SELECT app.secure_table('payment_transactions');
SELECT app.secure_table('webhook_events');
SELECT app.secure_table('returns');
SELECT app.secure_table('reviews');
SELECT app.secure_table('tax_invoices');
SELECT app.secure_table('tax_invoice_lines');

CREATE FUNCTION app.owns_order(p_order uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app.is_customer() AND EXISTS (SELECT 1 FROM "orders" o WHERE o."id" = p_order AND o."user_id" = app.user_id())
$$;
CREATE FUNCTION app.sub_order_visible(p_sub uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "sub_orders" s
    WHERE s."id" = p_sub
      AND ((app.is_vendor() AND s."vendor_id" = app.vendor_id()) OR app.owns_order(s."order_id")))
$$;

CREATE POLICY addresses_own ON "addresses" FOR ALL USING (app.is_customer() AND "user_id" = app.user_id())
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id());

-- coupons: vendor manages its own; public validation runs in a system step at checkout.
CREATE POLICY coupons_vendor ON "coupons" FOR ALL
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id())
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND "approval_status" = 'NOT_REQUIRED');

CREATE POLICY carts_own ON "carts" FOR ALL USING (app.is_customer() AND "user_id" = app.user_id())
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id());
CREATE POLICY cart_items_own ON "cart_items" FOR ALL
  USING (EXISTS (SELECT 1 FROM "carts" c WHERE c."id" = "cart_items"."cart_id" AND app.is_customer() AND c."user_id" = app.user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "carts" c WHERE c."id" = "cart_items"."cart_id" AND app.is_customer() AND c."user_id" = app.user_id()));

CREATE POLICY orders_customer_read ON "orders" FOR SELECT USING (app.is_customer() AND "user_id" = app.user_id());

CREATE POLICY sub_orders_customer_read ON "sub_orders" FOR SELECT USING (app.owns_order("order_id"));
CREATE POLICY sub_orders_vendor_read ON "sub_orders" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY sub_orders_vendor_update ON "sub_orders" FOR UPDATE
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id()) WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());

CREATE POLICY order_items_read ON "order_items" FOR SELECT USING (app.sub_order_visible("sub_order_id"));
CREATE POLICY order_status_history_read ON "order_status_history" FOR SELECT USING (app.sub_order_visible("sub_order_id"));
CREATE POLICY order_status_history_vendor_insert ON "order_status_history" FOR INSERT
  WITH CHECK (app.is_vendor() AND app.sub_order_visible("sub_order_id") AND "by_user_id" = app.user_id());

-- payments / payment_transactions / webhook_events: staff + system only.

CREATE POLICY returns_customer ON "returns" FOR SELECT USING (app.is_customer() AND "user_id" = app.user_id());
CREATE POLICY returns_customer_insert ON "returns" FOR INSERT
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id() AND "status" = 'REQUESTED' AND app.sub_order_visible("sub_order_id"));
CREATE POLICY returns_vendor_read ON "returns" FOR SELECT
  USING (app.is_vendor() AND EXISTS (SELECT 1 FROM "sub_orders" s WHERE s."id" = "returns"."sub_order_id" AND s."vendor_id" = app.vendor_id()));

CREATE POLICY reviews_public ON "reviews" FOR SELECT USING (app.is_reader() AND "status" = 'APPROVED');
CREATE POLICY reviews_own ON "reviews" FOR SELECT USING (app.is_customer() AND "user_id" = app.user_id());
CREATE POLICY reviews_own_insert ON "reviews" FOR INSERT
  WITH CHECK (app.is_customer() AND "user_id" = app.user_id() AND "status" = 'PENDING' AND "vendor_reply" IS NULL);
CREATE POLICY reviews_vendor_read ON "reviews" FOR SELECT USING (app.owns_product("product_id"));
CREATE POLICY reviews_vendor_reply ON "reviews" FOR UPDATE USING (app.owns_product("product_id")) WITH CHECK (app.owns_product("product_id"));

CREATE POLICY tax_invoices_customer ON "tax_invoices" FOR SELECT USING (app.owns_order("order_id"));
CREATE POLICY tax_invoice_lines_customer ON "tax_invoice_lines" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "tax_invoices" i WHERE i."id" = "tax_invoice_lines"."invoice_id" AND app.owns_order(i."order_id")));

-- vendors may only write vendor_reply on reviews of their products
CREATE FUNCTION app.guard_reviews() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - ARRAY['vendor_reply','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['vendor_reply','updated_at']) THEN
    RAISE EXCEPTION 'only vendor_reply can be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "reviews_guard" BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION app.guard_reviews();
