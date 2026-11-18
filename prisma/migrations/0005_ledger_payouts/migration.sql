-- 0005_ledger_payouts
-- wallet ledger append-only (C7), payouts, vendor purchase invoices (D11)
-- Part 1 is generated from prisma/schema.prisma by scripts/db/generate-baseline-migrations.ts.
-- Part 2 is hand-written: prisma/sql/0005_ledger_payouts.sql

-- ======================================================================= part 1: tables
CREATE TYPE "WalletTransactionType" AS ENUM ('SALE_CREDIT', 'COMMISSION_DEBIT', 'GATEWAY_FEE_DEBIT', 'REFUND_DEBIT', 'ADJUSTMENT', 'PAYOUT_DEBIT', 'SHIPPING_CREDIT', 'PURCHASE_VAT_CREDIT', 'COMMISSION_REVERSAL_CREDIT', 'PURCHASE_VAT_REVERSAL', 'SHIPPING_REVERSAL');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID');
CREATE TYPE "HoldReason" AS ENUM ('AWAITING_COMPLETION', 'AWAITING_SETTLEMENT', 'AWAITING_VENDOR_INVOICE');
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "PayoutBatchStatus" AS ENUM ('DRAFT', 'APPROVED', 'EXPORTED', 'PAID', 'CANCELLED');
CREATE TYPE "VendorPurchaseInvoiceStatus" AS ENUM ('EXPECTED', 'RECEIVED', 'MATCHED', 'REJECTED');

CREATE TABLE "payout_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_from" TIMESTAMPTZ(3) NOT NULL,
    "period_to" TIMESTAMPTZ(3) NOT NULL,
    "cutoff_at" TIMESTAMPTZ(3) NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "held_vat_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "PayoutBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "export_file_path" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payout_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "batch_id" UUID,
    "amount" INTEGER NOT NULL,
    "held_vat_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "bank_snapshot" JSONB NOT NULL,
    "cutoff_at" TIMESTAMPTZ(3) NOT NULL,
    "needs_manual_review" BOOLEAN NOT NULL DEFAULT false,
    "transfer_reference" TEXT,
    "receipt_path" TEXT,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "paid_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "sub_order_id" UUID,
    "payout_id" UUID,
    "return_id" UUID,
    "payment_transaction_id" UUID,
    "reverses_transaction_id" UUID,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "hold_reason" "HoldReason",
    "available_at" TIMESTAMPTZ(3),
    "note" TEXT,
    "created_by_user_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_purchase_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "payout_id" UUID,
    "period_from" TIMESTAMPTZ(3) NOT NULL,
    "period_to" TIMESTAMPTZ(3) NOT NULL,
    "vendor_invoice_number" TEXT,
    "issue_date" TIMESTAMPTZ(3),
    "net_amount" INTEGER NOT NULL,
    "vat_amount" INTEGER NOT NULL,
    "file_path" TEXT,
    "status" "VendorPurchaseInvoiceStatus" NOT NULL DEFAULT 'EXPECTED',
    "matched_by_user_id" UUID,
    "matched_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_purchase_invoices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payouts_vendor_id_status_idx" ON "payouts"("vendor_id", "status");
CREATE INDEX "payouts_batch_id_idx" ON "payouts"("batch_id");

CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_key" ON "wallet_transactions"("idempotency_key");
CREATE INDEX "wallet_transactions_vendor_id_status_available_at_idx" ON "wallet_transactions"("vendor_id", "status", "available_at");
CREATE INDEX "wallet_transactions_payout_id_idx" ON "wallet_transactions"("payout_id");
CREATE INDEX "wallet_transactions_sub_order_id_idx" ON "wallet_transactions"("sub_order_id");

CREATE INDEX "vendor_purchase_invoices_vendor_id_status_idx" ON "vendor_purchase_invoices"("vendor_id", "status");

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payout_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_sub_order_id_fkey" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_reverses_transaction_id_fkey" FOREIGN KEY ("reverses_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_purchase_invoices" ADD CONSTRAINT "vendor_purchase_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_purchase_invoices" ADD CONSTRAINT "vendor_purchase_invoices_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ======================================================================= part 2: hand-written
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
