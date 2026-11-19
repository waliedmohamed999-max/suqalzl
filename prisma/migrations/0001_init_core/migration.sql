-- 0001_init_core
-- RLS helpers (schema app), users + auth, cities, categories, vendors, settings, audit, jobs, CMS
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0001_init_core.sql

-- ======================================================================= part 0: hand-written (before tables)
-- Extensions are pre-installed by docker/postgres/init (dev, CI, template1). IF NOT EXISTS keeps
-- this portable to managed Postgres where the migrator may create trusted extensions itself.
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------------------------
-- RLS context (P1-00, SPEC §4 "RLS — القرار النهائي", D34)
--   Every request runs in ONE transaction that first calls
--     set_config('app.role'|'app.vendor_id'|'app.user_id', ..., true)   (= SET LOCAL)
--   via src/lib/db.ts::withCtx. No context => no policy matches => no rows (fail closed).
--   app.role in ('system','admin','vendor','customer','public').
--   RLS is a SECOND layer against bugs, not against SQL injection (no *RawUnsafe in the app).
-- ---------------------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO PUBLIC;

CREATE FUNCTION app.ctx_role() RETURNS text LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.role', true), '') $$;
CREATE FUNCTION app.vendor_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.vendor_id', true), '')::uuid $$;
CREATE FUNCTION app.user_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE FUNCTION app.is_staff() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() IN ('system', 'admin'), false) $$;
CREATE FUNCTION app.is_vendor() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() = 'vendor' AND app.vendor_id() IS NOT NULL, false) $$;
CREATE FUNCTION app.is_customer() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() = 'customer' AND app.user_id() IS NOT NULL, false) $$;
-- "Reader" contexts that may see public catalogue rows. Staff is covered by the staff policy.
CREATE FUNCTION app.is_reader() RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT coalesce(app.ctx_role() IN ('public', 'customer', 'vendor'), false) $$;

-- The runtime role is not hard-coded (dev: suqalzl_app; other environments may differ): it is any
-- non-superuser, non-owner role that infra granted USAGE on schema public
-- (docker/postgres/init/10-roles-databases-extensions.sh does exactly that).
CREATE FUNCTION app.runtime_roles() RETURNS SETOF name LANGUAGE sql STABLE AS $$
  SELECT r.rolname
  FROM pg_namespace n
  CROSS JOIN LATERAL aclexplode(n.nspacl) a
  JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public' AND a.privilege_type = 'USAGE'
    AND a.grantee <> n.nspowner AND NOT r.rolsuper
$$;

-- ENABLE + FORCE RLS, staff policy, and strip TRUNCATE/REFERENCES/TRIGGER (and DELETE unless
-- p_allow_delete) from every non-owner grantee (the runtime role got DML via default privileges).
-- Called for EVERY table right after it is created (SPEC §2: RLS in the same migration).
CREATE FUNCTION app.secure_table(p_table regclass, p_allow_delete boolean DEFAULT false, p_force boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  g record;
  t text := p_table::text;
  base text := regexp_replace(p_table::text, '^.*\.|"', '', 'g');
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
  IF p_force THEN
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
  END IF;
  EXECUTE format('CREATE POLICY %I ON %s FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff())', base || '_staff', t);
  FOR g IN
    SELECT DISTINCT r.rolname
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(c.relacl) a
    JOIN pg_roles r ON r.oid = a.grantee
    WHERE c.oid = p_table AND a.grantee <> c.relowner
  LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON %s FROM %I', t, g.rolname);
    IF NOT p_allow_delete THEN
      EXECUTE format('REVOKE DELETE ON %s FROM %I', t, g.rolname);
    END IF;
  END LOOP;
  EXECUTE format('REVOKE ALL ON %s FROM PUBLIC', t);
END $$;

-- Append-only guard (audit_logs M11, wallet_transactions C7, tax_invoices D13).
CREATE FUNCTION app.forbid_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: DELETE is not allowed', TG_TABLE_NAME USING ERRCODE = '42501';
END $$;
CREATE FUNCTION app.forbid_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: UPDATE is not allowed', TG_TABLE_NAME USING ERRCODE = '42501';
END $$;

-- ======================================================================= part 1: tables
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'STAFF', 'VENDOR_OWNER', 'VENDOR_STAFF', 'CUSTOMER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');
CREATE TYPE "AppLocale" AS ENUM ('ar', 'en');
CREATE TYPE "SessionScope" AS ENUM ('CUSTOMER', 'STAFF', 'VENDOR');
CREATE TYPE "OtpPurpose" AS ENUM ('CUSTOMER_LOGIN', 'STAFF_LOGIN', 'STAFF_2FA', 'PHONE_VERIFY');
CREATE TYPE "ConsentChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "VatStatus" AS ENUM ('NOT_REGISTERED', 'PENDING_VERIFICATION', 'REGISTERED_VERIFIED');
CREATE TYPE "ShippingMode" AS ENUM ('PLATFORM_SHIPPING', 'SELF_SHIPPING');
CREATE TYPE "VendorDocumentType" AS ENUM ('CR', 'FREELANCE', 'VAT', 'IBAN_LETTER', 'OTHER');
CREATE TYPE "ReviewDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "HomeSectionType" AS ENUM ('BANNERS', 'CATEGORIES', 'BUNDLES', 'CATEGORY_PRODUCTS', 'FEATURED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "phone_verified_at" TIMESTAMPTZ(3),
    "email" CITEXT,
    "email_verified_at" TIMESTAMPTZ(3),
    "password_hash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" "AppLocale" NOT NULL DEFAULT 'ar',
    "last_login_at" TIMESTAMPTZ(3),
    "bargain_suspended_until" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "scope" "SessionScope" NOT NULL DEFAULT 'CUSTOMER',
    "vendor_id" UUID,
    "two_factor_pending" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_verified_at" TIMESTAMPTZ(3),
    "ip" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "user_id" UUID,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "locked_at" TIMESTAMPTZ(3),
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trusted_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "marketing_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "channel" "ConsentChannel" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image_path" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "commission_rate" INTEGER,
    "show_on_home" BOOLEAN NOT NULL DEFAULT false,
    "home_sort" INTEGER NOT NULL DEFAULT 0,
    "vendors_allowed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "store_name_ar" TEXT NOT NULL,
    "store_name_en" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_path" TEXT,
    "cover_path" TEXT,
    "description_ar" TEXT,
    "description_en" TEXT,
    "legal_name" TEXT NOT NULL,
    "cr_number" TEXT,
    "freelance_doc_number" TEXT,
    "vat_number" TEXT,
    "vat_status" "VatStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
    "vat_verified_at" TIMESTAMPTZ(3),
    "is_resident" BOOLEAN NOT NULL DEFAULT true,
    "iban" TEXT,
    "iban_last4" TEXT,
    "bank_name" TEXT,
    "account_holder_name" TEXT,
    "city_id" UUID,
    "pickup_address" JSONB,
    "commission_rate" INTEGER,
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "agreement_accepted_at" TIMESTAMPTZ(3),
    "agreement_version" TEXT,
    "shipping_mode" "ShippingMode" NOT NULL DEFAULT 'PLATFORM_SHIPPING',
    "hold_days_override" INTEGER,
    "approved_at" TIMESTAMPTZ(3),
    "approved_by_user_id" UUID,
    "suspended_at" TIMESTAMPTZ(3),
    "bargain_suspended_until" TIMESTAMPTZ(3),
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "avg_response_minutes" INTEGER,
    "acceptance_rate_bps" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "type" "VendorDocumentType" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "status" "ReviewDecision" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_categories" (
    "vendor_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_categories_pkey" PRIMARY KEY ("vendor_id", "category_id")
);

CREATE TABLE "vendor_bank_change_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "iban" TEXT NOT NULL,
    "iban_last4" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "letter_document_id" UUID,
    "status" "ReviewDecision" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_bank_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "actor_role" TEXT,
    "vendor_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redirects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_path" TEXT NOT NULL,
    "to_path" TEXT NOT NULL,
    "code" INTEGER NOT NULL DEFAULT 301,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "content_ar" TEXT NOT NULL,
    "content_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "banners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "image_desktop_path" TEXT NOT NULL,
    "image_mobile_path" TEXT NOT NULL,
    "link" TEXT,
    "title_ar" TEXT,
    "title_en" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "home_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "HomeSectionType" NOT NULL,
    "ref_id" UUID,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "home_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "run_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "idempotency_key" TEXT,
    "locked_by" TEXT,
    "locked_until" TIMESTAMPTZ(3),
    "heartbeat_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE INDEX "otp_challenges_phone_purpose_created_at_idx" ON "otp_challenges"("phone", "purpose", "created_at" DESC);
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");

CREATE UNIQUE INDEX "trusted_devices_token_hash_key" ON "trusted_devices"("token_hash");
CREATE INDEX "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");

CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets"("expires_at");

CREATE INDEX "marketing_consents_user_id_channel_created_at_idx" ON "marketing_consents"("user_id", "channel", "created_at" DESC);

CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parent_id_sort_idx" ON "categories"("parent_id", "sort");

CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors"("slug");
CREATE INDEX "vendors_owner_user_id_idx" ON "vendors"("owner_user_id");
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

CREATE INDEX "vendor_documents_vendor_id_idx" ON "vendor_documents"("vendor_id");

CREATE INDEX "vendor_members_user_id_idx" ON "vendor_members"("user_id");
CREATE UNIQUE INDEX "vendor_members_vendor_id_user_id_key" ON "vendor_members"("vendor_id", "user_id");

CREATE INDEX "vendor_categories_category_id_vendor_id_idx" ON "vendor_categories"("category_id", "vendor_id");

CREATE INDEX "vendor_bank_change_requests_vendor_id_status_idx" ON "vendor_bank_change_requests"("vendor_id", "status");

CREATE INDEX "audit_logs_entity_entity_id_created_at_idx" ON "audit_logs"("entity", "entity_id", "created_at" DESC);
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

CREATE UNIQUE INDEX "redirects_from_path_key" ON "redirects"("from_path");

CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

CREATE INDEX "banners_is_active_sort_idx" ON "banners"("is_active", "sort");

CREATE INDEX "home_sections_is_active_sort_idx" ON "home_sections"("is_active", "sort");

CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "jobs"("idempotency_key");
CREATE INDEX "jobs_type_status_idx" ON "jobs"("type", "status");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_consents" ADD CONSTRAINT "marketing_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_members" ADD CONSTRAINT "vendor_members_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_members" ADD CONSTRAINT "vendor_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_categories" ADD CONSTRAINT "vendor_categories_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_categories" ADD CONSTRAINT "vendor_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_bank_change_requests" ADD CONSTRAINT "vendor_bank_change_requests_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ======================================================================= part 2: hand-written
-- ---------------------------------------------------------------- CHECKs
ALTER TABLE "users"
  ADD CONSTRAINT "users_phone_format" CHECK ("phone" IS NULL OR "phone" ~ '^\+9665[0-9]{8}$'),
  ADD CONSTRAINT "users_staff_or_phone" CHECK ("role" <> 'CUSTOMER' OR "phone" IS NOT NULL OR "deleted_at" IS NOT NULL);
ALTER TABLE "otp_challenges"
  ADD CONSTRAINT "otp_phone_format" CHECK ("phone" ~ '^\+9665[0-9]{8}$'),
  ADD CONSTRAINT "otp_attempts_range" CHECK ("attempts" >= 0 AND "attempts" <= "max_attempts");
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_commission_bps" CHECK ("commission_rate" IS NULL OR "commission_rate" BETWEEN 0 AND 10000);
ALTER TABLE "vendors"
  ADD CONSTRAINT "vendors_commission_bps" CHECK ("commission_rate" IS NULL OR "commission_rate" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "vendors_hold_days" CHECK ("hold_days_override" IS NULL OR "hold_days_override" BETWEEN 0 AND 90),
  ADD CONSTRAINT "vendors_iban_last4" CHECK ("iban_last4" IS NULL OR "iban_last4" ~ '^[0-9]{4}$'),
  ADD CONSTRAINT "vendors_vat_number" CHECK ("vat_number" IS NULL OR "vat_number" ~ '^3[0-9]{13}3$'),
  ADD CONSTRAINT "vendors_acceptance_bps" CHECK ("acceptance_rate_bps" IS NULL OR "acceptance_rate_bps" BETWEEN 0 AND 10000);
ALTER TABLE "vendor_bank_change_requests"
  ADD CONSTRAINT "vbcr_iban_last4" CHECK ("iban_last4" ~ '^[0-9]{4}$');
ALTER TABLE "redirects"
  ADD CONSTRAINT "redirects_code" CHECK ("code" IN (301, 302, 308));
ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_type_slug" CHECK ("type" ~ '^[a-z0-9-]+$'),
  ADD CONSTRAINT "jobs_attempts" CHECK ("attempts" >= 0);

-- Worker pulls with FOR UPDATE SKIP LOCKED (devops.md §6.5).
CREATE INDEX "jobs_pending_run_at_idx" ON "jobs" ("run_at") WHERE "status" = 'PENDING';
-- One active session token lookup is by token_hash (unique). Expired-session sweep:
CREATE INDEX "otp_challenges_open_idx" ON "otp_challenges" ("phone", "purpose") WHERE "consumed_at" IS NULL AND "locked_at" IS NULL;

-- ---------------------------------------------------------------- privileged-column guards
-- RLS is row-level only. A customer/vendor may update its own row through the service, but never
-- these columns; only staff contexts (admin/system) can.
CREATE FUNCTION app.guard_users() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF NEW."role" IS DISTINCT FROM OLD."role"
     OR NEW."permissions" IS DISTINCT FROM OLD."permissions"
     OR NEW."status" IS DISTINCT FROM OLD."status"
     OR NEW."password_hash" IS DISTINCT FROM OLD."password_hash"
     OR NEW."phone" IS DISTINCT FROM OLD."phone"
     OR NEW."phone_verified_at" IS DISTINCT FROM OLD."phone_verified_at"
     OR NEW."bargain_suspended_until" IS DISTINCT FROM OLD."bargain_suspended_until"
     OR NEW."deleted_at" IS DISTINCT FROM OLD."deleted_at" THEN
    RAISE EXCEPTION 'privileged user columns can only be changed by staff' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "users_guard" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION app.guard_users();

CREATE FUNCTION app.guard_vendors() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDING' OR NEW."is_trusted" OR NEW."commission_rate" IS NOT NULL
       OR NEW."hold_days_override" IS NOT NULL OR NEW."vat_status" = 'REGISTERED_VERIFIED' THEN
      RAISE EXCEPTION 'vendor application must start PENDING without privileged values' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW."status" IS DISTINCT FROM OLD."status"
     OR NEW."owner_user_id" IS DISTINCT FROM OLD."owner_user_id"
     OR NEW."is_trusted" IS DISTINCT FROM OLD."is_trusted"
     OR NEW."commission_rate" IS DISTINCT FROM OLD."commission_rate"
     OR NEW."hold_days_override" IS DISTINCT FROM OLD."hold_days_override"
     OR NEW."vat_status" IS DISTINCT FROM OLD."vat_status"
     OR NEW."vat_verified_at" IS DISTINCT FROM OLD."vat_verified_at"
     OR NEW."is_resident" IS DISTINCT FROM OLD."is_resident"
     OR NEW."iban" IS DISTINCT FROM OLD."iban"
     OR NEW."iban_last4" IS DISTINCT FROM OLD."iban_last4"
     OR NEW."bank_name" IS DISTINCT FROM OLD."bank_name"
     OR NEW."account_holder_name" IS DISTINCT FROM OLD."account_holder_name"
     OR NEW."shipping_mode" IS DISTINCT FROM OLD."shipping_mode"
     OR NEW."approved_at" IS DISTINCT FROM OLD."approved_at"
     OR NEW."suspended_at" IS DISTINCT FROM OLD."suspended_at"
     OR NEW."bargain_suspended_until" IS DISTINCT FROM OLD."bargain_suspended_until"
     OR NEW."rating_avg" IS DISTINCT FROM OLD."rating_avg"
     OR NEW."rating_count" IS DISTINCT FROM OLD."rating_count"
     OR NEW."avg_response_minutes" IS DISTINCT FROM OLD."avg_response_minutes"
     OR NEW."acceptance_rate_bps" IS DISTINCT FROM OLD."acceptance_rate_bps" THEN
    -- IBAN changes go through vendor_bank_change_requests + admin approval (M2).
    RAISE EXCEPTION 'privileged vendor columns can only be changed by staff' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "vendors_guard" BEFORE INSERT OR UPDATE ON "vendors" FOR EACH ROW EXECUTE FUNCTION app.guard_vendors();

-- ---------------------------------------------------------------- append-only audit log (M11)
CREATE TRIGGER "audit_logs_no_update" BEFORE UPDATE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION app.forbid_update();
CREATE TRIGGER "audit_logs_no_delete" BEFORE DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION app.forbid_delete();

-- ---------------------------------------------------------------- RLS
SELECT app.secure_table('users');
SELECT app.secure_table('sessions', true);
SELECT app.secure_table('otp_challenges', true);
SELECT app.secure_table('trusted_devices', true);
SELECT app.secure_table('rate_limit_buckets', true);
SELECT app.secure_table('marketing_consents');
SELECT app.secure_table('cities');
SELECT app.secure_table('categories');
SELECT app.secure_table('vendors');
SELECT app.secure_table('vendor_documents');
SELECT app.secure_table('vendor_members', true);
SELECT app.secure_table('vendor_categories', true);
SELECT app.secure_table('vendor_bank_change_requests');
SELECT app.secure_table('settings');
SELECT app.secure_table('audit_logs');
SELECT app.secure_table('notifications', true);
SELECT app.secure_table('redirects', true);
SELECT app.secure_table('pages');
SELECT app.secure_table('banners', true);
SELECT app.secure_table('home_sections', true);
SELECT app.secure_table('jobs', true);

-- users: own row only (vendors never read customers; shipping data comes from order snapshots, SPEC §4)
CREATE POLICY users_self_read ON "users" FOR SELECT USING ("id" = app.user_id());
CREATE POLICY users_self_update ON "users" FOR UPDATE USING ("id" = app.user_id()) WITH CHECK ("id" = app.user_id());

-- sessions / otp / trusted devices / rate limits: staff (system) only — handled by src/lib/auth.

CREATE POLICY consents_self_read ON "marketing_consents" FOR SELECT USING ("user_id" = app.user_id());
CREATE POLICY consents_self_insert ON "marketing_consents" FOR INSERT WITH CHECK ("user_id" = app.user_id());

-- public reference data
CREATE POLICY cities_read ON "cities" FOR SELECT USING (app.is_reader() AND "is_active");
CREATE POLICY categories_read ON "categories" FOR SELECT USING (app.is_reader() AND "is_active");
CREATE POLICY pages_read ON "pages" FOR SELECT USING (app.is_reader() AND "is_active");
CREATE POLICY banners_read ON "banners" FOR SELECT USING (app.is_reader() AND "is_active");
CREATE POLICY home_sections_read ON "home_sections" FOR SELECT USING (app.is_reader() AND "is_active");
CREATE POLICY redirects_read ON "redirects" FOR SELECT USING (app.is_reader());
CREATE POLICY settings_public_read ON "settings" FOR SELECT USING (app.is_reader() AND "is_public");

-- vendors: own row rw (privileged columns guarded by trigger), public read of approved stores,
-- a customer may APPLY (insert PENDING for itself) from /sell.
CREATE POLICY vendors_own_read ON "vendors" FOR SELECT USING (app.is_vendor() AND "id" = app.vendor_id());
CREATE POLICY vendors_own_update ON "vendors" FOR UPDATE
  USING (app.is_vendor() AND "id" = app.vendor_id()) WITH CHECK (app.is_vendor() AND "id" = app.vendor_id());
CREATE POLICY vendors_public_read ON "vendors" FOR SELECT USING (app.is_reader() AND "status" = 'APPROVED');
CREATE POLICY vendors_apply ON "vendors" FOR INSERT
  WITH CHECK (app.is_customer() AND "owner_user_id" = app.user_id());
CREATE POLICY vendors_applicant_read ON "vendors" FOR SELECT
  USING (app.is_customer() AND "owner_user_id" = app.user_id());

CREATE POLICY vendor_documents_own ON "vendor_documents" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY vendor_documents_own_insert ON "vendor_documents" FOR INSERT
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND "status" = 'PENDING');

CREATE POLICY vendor_members_own ON "vendor_members" FOR ALL
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id()) WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());
-- a user can see its own memberships (login: pick the vendor context)
CREATE POLICY vendor_members_self ON "vendor_members" FOR SELECT USING ("user_id" = app.user_id());

CREATE POLICY vendor_categories_own ON "vendor_categories" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());

CREATE POLICY vbcr_own_read ON "vendor_bank_change_requests" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY vbcr_own_insert ON "vendor_bank_change_requests" FOR INSERT
  WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id() AND "status" = 'PENDING');

-- audit: anyone with a context may append; only staff reads (staff policy).
CREATE POLICY audit_logs_append ON "audit_logs" FOR INSERT WITH CHECK (app.ctx_role() IS NOT NULL);

CREATE POLICY notifications_own_read ON "notifications" FOR SELECT USING ("user_id" = app.user_id());
CREATE POLICY notifications_own_update ON "notifications" FOR UPDATE USING ("user_id" = app.user_id()) WITH CHECK ("user_id" = app.user_id());

-- a VENDOR session always carries its vendor; others never do
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_scope_vendor" CHECK (("scope" = 'VENDOR') = ("vendor_id" IS NOT NULL));
