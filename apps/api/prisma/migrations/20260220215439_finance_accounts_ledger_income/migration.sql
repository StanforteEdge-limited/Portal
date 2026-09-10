-- AlterTable
ALTER TABLE "sta_finance_payment_vouchers" ADD COLUMN     "paid_from_account_id" UUID;

-- AlterTable
ALTER TABLE "sta_profiles" ALTER COLUMN "username" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sta_taxonomy_tag_assignments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sta_finance_accounts" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(60),
    "account_type" VARCHAR(30) NOT NULL DEFAULT 'bank',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_ledger_entries" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "entry_date" TIMESTAMP(3) NOT NULL,
    "description" VARCHAR(255),
    "source_type" VARCHAR(60),
    "source_id" VARCHAR(120),
    "metadata" JSONB,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_income_entries" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "received_at" TIMESTAMP(3) NOT NULL,
    "reference" VARCHAR(120),
    "payer" VARCHAR(150),
    "category_id" UUID,
    "notes" TEXT,
    "file_id" UUID,
    "metadata" JSONB,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_income_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_accounts_organization_id_idx" ON "sta_finance_accounts"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_accounts_account_type_idx" ON "sta_finance_accounts"("account_type");

-- CreateIndex
CREATE INDEX "sta_finance_accounts_is_active_idx" ON "sta_finance_accounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_accounts_organization_id_name_key" ON "sta_finance_accounts"("organization_id", "name");

-- CreateIndex
CREATE INDEX "sta_finance_ledger_entries_account_id_idx" ON "sta_finance_ledger_entries"("account_id");

-- CreateIndex
CREATE INDEX "sta_finance_ledger_entries_entry_date_idx" ON "sta_finance_ledger_entries"("entry_date");

-- CreateIndex
CREATE INDEX "sta_finance_ledger_entries_source_type_source_id_idx" ON "sta_finance_ledger_entries"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "sta_finance_ledger_entries_direction_idx" ON "sta_finance_ledger_entries"("direction");

-- CreateIndex
CREATE INDEX "sta_finance_income_entries_account_id_idx" ON "sta_finance_income_entries"("account_id");

-- CreateIndex
CREATE INDEX "sta_finance_income_entries_received_at_idx" ON "sta_finance_income_entries"("received_at");

-- CreateIndex
CREATE INDEX "sta_finance_income_entries_category_id_idx" ON "sta_finance_income_entries"("category_id");

-- CreateIndex
CREATE INDEX "sta_finance_payment_vouchers_paid_from_account_id_idx" ON "sta_finance_payment_vouchers"("paid_from_account_id");

-- AddForeignKey
ALTER TABLE "sta_finance_accounts" ADD CONSTRAINT "sta_finance_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_ledger_entries" ADD CONSTRAINT "sta_finance_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_income_entries" ADD CONSTRAINT "sta_finance_income_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_income_entries" ADD CONSTRAINT "sta_finance_income_entries_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "sta_file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_payment_vouchers" ADD CONSTRAINT "sta_finance_payment_vouchers_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "unique_taxonomy_entity_tag" RENAME TO "sta_taxonomy_tag_assignments_taxonomy_id_term_id_entity_typ_key";
