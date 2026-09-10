CREATE TABLE "sta_request_item_files" (
  "id" UUID NOT NULL,
  "request_item_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_request_item_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sta_finance_payment_voucher_files" (
  "id" UUID NOT NULL,
  "voucher_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "file_kind" VARCHAR(30) NOT NULL DEFAULT 'evidence',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_finance_payment_voucher_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unique_request_item_file" ON "sta_request_item_files"("request_item_id", "file_id");
CREATE INDEX "sta_request_item_files_request_item_id_sort_order_idx" ON "sta_request_item_files"("request_item_id", "sort_order");
CREATE INDEX "sta_request_item_files_file_id_idx" ON "sta_request_item_files"("file_id");

CREATE UNIQUE INDEX "unique_finance_payment_voucher_file" ON "sta_finance_payment_voucher_files"("voucher_id", "file_id", "file_kind");
CREATE INDEX "sta_finance_payment_voucher_files_voucher_id_file_kind_sort_order_idx" ON "sta_finance_payment_voucher_files"("voucher_id", "file_kind", "sort_order");
CREATE INDEX "sta_finance_payment_voucher_files_file_id_idx" ON "sta_finance_payment_voucher_files"("file_id");

ALTER TABLE "sta_request_item_files"
ADD CONSTRAINT "sta_request_item_files_request_item_id_fkey"
FOREIGN KEY ("request_item_id") REFERENCES "sta_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_request_item_files"
ADD CONSTRAINT "sta_request_item_files_file_id_fkey"
FOREIGN KEY ("file_id") REFERENCES "sta_file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_payment_voucher_files"
ADD CONSTRAINT "sta_finance_payment_voucher_files_voucher_id_fkey"
FOREIGN KEY ("voucher_id") REFERENCES "sta_finance_payment_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_payment_voucher_files"
ADD CONSTRAINT "sta_finance_payment_voucher_files_file_id_fkey"
FOREIGN KEY ("file_id") REFERENCES "sta_file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "sta_request_item_files" ("id", "request_item_id", "file_id", "sort_order", "created_at")
SELECT gen_random_uuid(), "id", "file_id", 0, CURRENT_TIMESTAMP
FROM "sta_request_items"
WHERE "file_id" IS NOT NULL;

INSERT INTO "sta_finance_payment_voucher_files" ("id", "voucher_id", "file_id", "file_kind", "sort_order", "created_at")
SELECT gen_random_uuid(), "id", "evidence_file_id", 'evidence', 0, CURRENT_TIMESTAMP
FROM "sta_finance_payment_vouchers"
WHERE "evidence_file_id" IS NOT NULL;
