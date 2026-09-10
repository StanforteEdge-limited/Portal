ALTER TABLE "sta_finance_sales_invoices"
ADD COLUMN "sent_at" TIMESTAMP(3),
ADD COLUMN "voided_at" TIMESTAMP(3);

CREATE TABLE "sta_finance_receipt_allocations" (
  "id" UUID NOT NULL,
  "receipt_id" UUID NOT NULL,
  "sales_invoice_id" UUID NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_finance_receipt_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_finance_receipt_allocations_receipt_id_idx" ON "sta_finance_receipt_allocations"("receipt_id");
CREATE INDEX "sta_finance_receipt_allocations_sales_invoice_id_idx" ON "sta_finance_receipt_allocations"("sales_invoice_id");
CREATE UNIQUE INDEX "unique_receipt_invoice_allocation" ON "sta_finance_receipt_allocations"("receipt_id", "sales_invoice_id");

ALTER TABLE "sta_finance_receipt_allocations"
ADD CONSTRAINT "sta_finance_receipt_allocations_receipt_id_fkey"
FOREIGN KEY ("receipt_id") REFERENCES "sta_finance_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_receipt_allocations"
ADD CONSTRAINT "sta_finance_receipt_allocations_sales_invoice_id_fkey"
FOREIGN KEY ("sales_invoice_id") REFERENCES "sta_finance_sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "sta_finance_receipt_allocations" ("id", "receipt_id", "sales_invoice_id", "amount", "created_at", "updated_at")
SELECT gen_random_uuid(), r."id", r."sales_invoice_id", r."amount", r."created_at", r."updated_at"
FROM "sta_finance_receipts" r
WHERE r."sales_invoice_id" IS NOT NULL
ON CONFLICT ("receipt_id", "sales_invoice_id") DO NOTHING;

UPDATE "sta_finance_sales_invoices" i
SET "sent_at" = COALESCE(i."sent_at", i."created_at")
WHERE i."status" IN ('posted', 'sent', 'part_paid', 'paid', 'overdue');
