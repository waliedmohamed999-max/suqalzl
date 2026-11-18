-- 0001_spike_init
-- Tables for prisma/schema.prisma. Hand-written in Prisma's DDL style because the Prisma
-- schema-engine binary could not be downloaded in this environment (see REPORT.md §1).

CREATE SEQUENCE "price_request_number_seq" START 10001;

CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'VENDOR_OWNER', 'SUPER_ADMIN');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PriceRequestType" AS ENUM ('PRODUCT', 'OPEN');
CREATE TYPE "PriceRequestStatus" AS ENUM ('OPEN', 'HAS_OFFERS', 'ACCEPTED', 'CONVERTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RecipientStatus" AS ENUM ('SENT', 'SEEN', 'RESPONDED', 'DECLINED', 'IGNORED');
CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CLOSED');
CREATE TYPE "OfferAuthor" AS ENUM ('VENDOR', 'CUSTOMER');
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'WITHDRAWN');
CREATE TYPE "ReservationSource" AS ENUM ('ORDER', 'PRICE_LOCK');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "store_name_ar" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name_ar" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID,
    "category_id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "base_price" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "reserved_stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "variant_negotiation_settings" (
    "variant_id" UUID NOT NULL,
    "floor_price" INTEGER NOT NULL,
    "auto_accept_price" INTEGER,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "variant_negotiation_settings_pkey" PRIMARY KEY ("variant_id")
);

CREATE TABLE "price_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL DEFAULT ('PR-'::text || nextval('price_request_number_seq'::regclass)),
    "customer_id" UUID NOT NULL,
    "type" "PriceRequestType" NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "category_id" UUID NOT NULL,
    "title_ar" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "target_price" INTEGER NOT NULL,
    "status" "PriceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "broadcast_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_request_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_request_recipients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "negotiation_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "vendor_rounds" INTEGER NOT NULL DEFAULT 0,
    "customer_rounds" INTEGER NOT NULL DEFAULT 0,
    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "negotiation_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "author" "OfferAuthor" NOT NULL,
    "round" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "source_type" "ReservationSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "realtime_events" (
    "id" BIGSERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "realtime_events_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "vendors_owner_user_id_idx" ON "vendors"("owner_user_id");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "products_vendor_id_status_idx" ON "products"("vendor_id", "status");
CREATE INDEX "products_status_category_id_created_at_idx" ON "products"("status", "category_id", "created_at" DESC);
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");
CREATE UNIQUE INDEX "price_requests_number_key" ON "price_requests"("number");
CREATE INDEX "price_requests_customer_id_status_idx" ON "price_requests"("customer_id", "status");
CREATE INDEX "price_requests_category_id_status_created_at_idx" ON "price_requests"("category_id", "status", "created_at" DESC);
CREATE UNIQUE INDEX "price_request_recipients_request_id_vendor_id_key" ON "price_request_recipients"("request_id", "vendor_id");
CREATE INDEX "price_request_recipients_vendor_id_status_created_at_idx" ON "price_request_recipients"("vendor_id", "status", "created_at" DESC);
CREATE UNIQUE INDEX "negotiation_threads_request_id_vendor_id_key" ON "negotiation_threads"("request_id", "vendor_id");
CREATE INDEX "negotiation_threads_vendor_id_status_idx" ON "negotiation_threads"("vendor_id", "status");
CREATE INDEX "price_offers_thread_id_created_at_idx" ON "price_offers"("thread_id", "created_at");
CREATE INDEX "price_offers_request_id_idx" ON "price_offers"("request_id");
CREATE INDEX "stock_reservations_source_type_source_id_idx" ON "stock_reservations"("source_type", "source_id");
CREATE INDEX "realtime_events_topic_id_idx" ON "realtime_events"("topic", "id");
CREATE INDEX "realtime_events_created_at_idx" ON "realtime_events"("created_at");

-- Foreign keys
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "variant_negotiation_settings" ADD CONSTRAINT "variant_negotiation_settings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_request_recipients" ADD CONSTRAINT "price_request_recipients_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "price_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_request_recipients" ADD CONSTRAINT "price_request_recipients_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "price_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "negotiation_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "price_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_offers" ADD CONSTRAINT "price_offers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
