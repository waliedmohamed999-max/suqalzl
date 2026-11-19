-- ---------------------------------------------------------------- CHECKs
ALTER TABLE "wallet_transactions"
  -- sign must match the type (backend.md 5.5, finance.md 6.3)
  ADD CONSTRAINT "wallet_transactions_sign" CHECK (
    ("type" IN ('SALE_CREDIT', 'SHIPPING_CREDIT', 'PURCHASE_VAT_CREDIT', 'COMMISSION_REVERSAL_CREDIT') AND "amount" > 0) OR
    ("type" IN ('COMMISSION_DEBIT', 'GATEWAY_FEE_DEBIT', 'REFUND_DEBIT', 'PAYOUT_DEBIT', 'PURCHASE_VAT_REVERSAL', 'SHIPPING_REVERSAL') AND "amount" < 0) OR
    ("type" = 'ADJUSTMENT' AND "amount" <> 0)),
  ADD CONSTRAINT "wallet_transactions_adjustment_note" CHECK ("type" <> 'ADJUSTMENT' OR ("note" IS NOT NULL AND "created_by_user_id" IS NOT NULL));
ALTER TABLE "payouts"
  ADD CONSTRAINT "payouts_amounts" CHECK ("amount" >= 0 AND "held_vat_amount" >= 0),
  ADD CONSTRAINT "payouts_paid_has_reference" CHECK ("status" <> 'PAID' OR ("transfer_reference" IS NOT NULL AND "paid_at" IS NOT NULL));
ALTER TABLE "payout_batches"
  ADD CONSTRAINT "payout_batches_period" CHECK ("period_to" > "period_from" AND "total_amount" >= 0 AND "held_vat_amount" >= 0);
ALTER TABLE "vendor_purchase_invoices"
  ADD CONSTRAINT "vpi_amounts" CHECK ("net_amount" >= 0 AND "vat_amount" >= 0 AND "period_to" > "period_from");

-- ---------------------------------------------------------------- append-only ledger (C7)
-- Allowed changes: status forward (PENDING -> AVAILABLE -> PAID, or PENDING -> PAID), hold_reason,
-- available_at, payout_id. Everything else is immutable; corrections are ADJUSTMENT rows.
CREATE FUNCTION app.guard_wallet_transactions() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['status','hold_reason','available_at','payout_id','updated_at'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','hold_reason','available_at','payout_id','updated_at']) THEN
    RAISE EXCEPTION 'wallet_transactions is append-only (use an ADJUSTMENT)' USING ERRCODE = '42501';
  END IF;
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
       (OLD."status" = 'PENDING' AND NEW."status" IN ('AVAILABLE', 'PAID'))
    OR (OLD."status" = 'AVAILABLE' AND NEW."status" = 'PAID')) THEN
    RAISE EXCEPTION 'wallet status cannot move % -> %', OLD."status", NEW."status" USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "wallet_transactions_guard" BEFORE UPDATE ON "wallet_transactions" FOR EACH ROW EXECUTE FUNCTION app.guard_wallet_transactions();
CREATE TRIGGER "wallet_transactions_no_delete" BEFORE DELETE ON "wallet_transactions" FOR EACH ROW EXECUTE FUNCTION app.forbid_delete();

CREATE FUNCTION app.guard_vendor_purchase_invoices() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_staff() THEN RETURN NEW; END IF;
  IF NEW."status" NOT IN ('EXPECTED', 'RECEIVED')
     OR NEW."net_amount" IS DISTINCT FROM OLD."net_amount" OR NEW."vat_amount" IS DISTINCT FROM OLD."vat_amount"
     OR NEW."matched_by_user_id" IS DISTINCT FROM OLD."matched_by_user_id" THEN
    RAISE EXCEPTION 'vendors can only upload their invoice' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "vendor_purchase_invoices_guard" BEFORE UPDATE ON "vendor_purchase_invoices" FOR EACH ROW EXECUTE FUNCTION app.guard_vendor_purchase_invoices();

-- ---------------------------------------------------------------- RLS
SELECT app.secure_table('payout_batches');
SELECT app.secure_table('payouts');
SELECT app.secure_table('wallet_transactions');
SELECT app.secure_table('vendor_purchase_invoices');

CREATE POLICY payouts_vendor_read ON "payouts" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY wallet_vendor_read ON "wallet_transactions" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY vpi_vendor_read ON "vendor_purchase_invoices" FOR SELECT USING (app.is_vendor() AND "vendor_id" = app.vendor_id());
CREATE POLICY vpi_vendor_upload ON "vendor_purchase_invoices" FOR UPDATE
  USING (app.is_vendor() AND "vendor_id" = app.vendor_id()) WITH CHECK (app.is_vendor() AND "vendor_id" = app.vendor_id());
