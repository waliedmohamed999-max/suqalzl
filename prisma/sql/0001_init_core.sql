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
