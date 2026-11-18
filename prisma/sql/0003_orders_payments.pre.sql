-- M1: gap-tolerant, race-free document numbers (never max()+1).
CREATE SEQUENCE "order_number_seq" START 100001;
CREATE SEQUENCE "tax_invoice_number_seq" START 1;
-- ICV (ZATCA invoice counter value): strictly increasing, one EGS for now (D13, P8 decides more).
CREATE SEQUENCE "tax_invoice_icv_seq" START 1;
