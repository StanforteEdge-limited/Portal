-- AlterTable: ensure lockout_until exists for production environments
ALTER TABLE "sta_profiles"
  ADD COLUMN IF NOT EXISTS "lockout_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sta_finance_items" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(60),
    "description" TEXT,
    "item_type" VARCHAR(30) NOT NULL DEFAULT 'service',
    "unit" VARCHAR(30),
    "unit_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(15,4),
    "currency" VARCHAR(5) NOT NULL DEFAULT 'NGN',
    "chart_account_id" UUID,
    "organization_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_expenses" (
    "id" UUID NOT NULL,
    "expense_number" VARCHAR(60) NOT NULL,
    "vendor_id" UUID,
    "account_id" UUID NOT NULL,
    "chart_account_id" UUID,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "expense_date" DATE NOT NULL,
    "category" VARCHAR(60),
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(5) NOT NULL DEFAULT 'NGN',
    "tax_amount" DECIMAL(15,2),
    "total_amount" DECIMAL(15,2),
    "reference" VARCHAR(120),
    "receipt_file_id" UUID,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_items_item_type_idx" ON "sta_finance_items"("item_type");

-- CreateIndex
CREATE INDEX "sta_finance_items_is_active_idx" ON "sta_finance_items"("is_active");

-- CreateIndex
CREATE INDEX "sta_finance_items_organization_id_idx" ON "sta_finance_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_expenses_expense_number_key" ON "sta_finance_expenses"("expense_number");

-- CreateIndex
CREATE INDEX "sta_finance_expenses_status_idx" ON "sta_finance_expenses"("status");

-- CreateIndex
CREATE INDEX "sta_finance_expenses_expense_date_idx" ON "sta_finance_expenses"("expense_date");

-- CreateIndex
CREATE INDEX "sta_finance_expenses_vendor_id_idx" ON "sta_finance_expenses"("vendor_id");

-- CreateIndex
CREATE INDEX "sta_finance_expenses_account_id_idx" ON "sta_finance_expenses"("account_id");

-- CreateIndex
CREATE INDEX "sta_finance_expenses_organization_id_idx" ON "sta_finance_expenses"("organization_id");

-- AddForeignKey
ALTER TABLE "sta_finance_items" ADD CONSTRAINT "sta_finance_items_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_items" ADD CONSTRAINT "sta_finance_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_items" ADD CONSTRAINT "sta_finance_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_expenses" ADD CONSTRAINT "sta_finance_expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_expenses" ADD CONSTRAINT "sta_finance_expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_expenses" ADD CONSTRAINT "sta_finance_expenses_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_expenses" ADD CONSTRAINT "sta_finance_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_expenses" ADD CONSTRAINT "sta_finance_expenses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
