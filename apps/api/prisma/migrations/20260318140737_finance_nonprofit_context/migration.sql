-- AlterTable
ALTER TABLE "sta_finance_bill_headers" ADD COLUMN     "fund_id" UUID,
ADD COLUMN     "grant_id" UUID;

-- AlterTable
ALTER TABLE "sta_finance_income_entries" ADD COLUMN     "fund_id" UUID,
ADD COLUMN     "grant_id" UUID;

-- AlterTable
ALTER TABLE "sta_finance_journal_lines" ADD COLUMN     "fund_id" UUID,
ADD COLUMN     "grant_id" UUID;

-- AlterTable
ALTER TABLE "sta_finance_payment_vouchers" ADD COLUMN     "fund_id" UUID,
ADD COLUMN     "grant_id" UUID;

-- AlterTable
ALTER TABLE "sta_finance_sales_invoices" ADD COLUMN     "fund_id" UUID,
ADD COLUMN     "grant_id" UUID;

-- CreateTable
CREATE TABLE "sta_finance_donors" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "name" VARCHAR(150) NOT NULL,
    "donor_type" VARCHAR(40) NOT NULL DEFAULT 'grantor',
    "email" VARCHAR(255),
    "phone" VARCHAR(40),
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_funds" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "donor_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "fund_type" VARCHAR(40) NOT NULL DEFAULT 'operating',
    "restriction_type" VARCHAR(40) NOT NULL DEFAULT 'unrestricted',
    "purpose" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_grants" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "donor_id" UUID,
    "fund_id" UUID,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "restriction_type" VARCHAR(40) NOT NULL DEFAULT 'restricted',
    "start_date" DATE,
    "end_date" DATE,
    "committed_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recognized_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deferred_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "purpose" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_donors_organization_id_idx" ON "sta_finance_donors"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_donors_is_active_idx" ON "sta_finance_donors"("is_active");

-- CreateIndex
CREATE INDEX "sta_finance_funds_organization_id_idx" ON "sta_finance_funds"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_funds_restriction_type_idx" ON "sta_finance_funds"("restriction_type");

-- CreateIndex
CREATE INDEX "sta_finance_funds_is_active_idx" ON "sta_finance_funds"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_funds_organization_id_code_key" ON "sta_finance_funds"("organization_id", "code");

-- CreateIndex
CREATE INDEX "sta_finance_grants_organization_id_idx" ON "sta_finance_grants"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_grants_donor_id_idx" ON "sta_finance_grants"("donor_id");

-- CreateIndex
CREATE INDEX "sta_finance_grants_fund_id_idx" ON "sta_finance_grants"("fund_id");

-- CreateIndex
CREATE INDEX "sta_finance_grants_status_idx" ON "sta_finance_grants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_grants_organization_id_code_key" ON "sta_finance_grants"("organization_id", "code");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_fund_id_idx" ON "sta_finance_bill_headers"("fund_id");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_grant_id_idx" ON "sta_finance_bill_headers"("grant_id");

-- CreateIndex
CREATE INDEX "sta_finance_income_entries_fund_id_idx" ON "sta_finance_income_entries"("fund_id");

-- CreateIndex
CREATE INDEX "sta_finance_income_entries_grant_id_idx" ON "sta_finance_income_entries"("grant_id");

-- CreateIndex
CREATE INDEX "sta_finance_journal_lines_fund_id_idx" ON "sta_finance_journal_lines"("fund_id");

-- CreateIndex
CREATE INDEX "sta_finance_journal_lines_grant_id_idx" ON "sta_finance_journal_lines"("grant_id");

-- CreateIndex
CREATE INDEX "sta_finance_payment_vouchers_fund_id_idx" ON "sta_finance_payment_vouchers"("fund_id");

-- CreateIndex
CREATE INDEX "sta_finance_payment_vouchers_grant_id_idx" ON "sta_finance_payment_vouchers"("grant_id");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_fund_id_idx" ON "sta_finance_sales_invoices"("fund_id");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_grant_id_idx" ON "sta_finance_sales_invoices"("grant_id");

-- AddForeignKey
ALTER TABLE "sta_finance_funds" ADD CONSTRAINT "sta_finance_funds_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "sta_finance_donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_grants" ADD CONSTRAINT "sta_finance_grants_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "sta_finance_donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_grants" ADD CONSTRAINT "sta_finance_grants_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_lines" ADD CONSTRAINT "sta_finance_journal_lines_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_lines" ADD CONSTRAINT "sta_finance_journal_lines_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_income_entries" ADD CONSTRAINT "sta_finance_income_entries_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_income_entries" ADD CONSTRAINT "sta_finance_income_entries_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_payment_vouchers" ADD CONSTRAINT "sta_finance_payment_vouchers_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_payment_vouchers" ADD CONSTRAINT "sta_finance_payment_vouchers_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
