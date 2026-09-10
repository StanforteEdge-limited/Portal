-- AlterTable
ALTER TABLE "sta_finance_receipt_allocations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sta_payroll_workers" (
    "id" UUID NOT NULL,
    "profile_id" BIGINT,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "project_id" BIGINT,
    "default_fund_id" UUID,
    "default_grant_id" UUID,
    "worker_type" VARCHAR(20) NOT NULL DEFAULT 'employee',
    "full_name" VARCHAR(180) NOT NULL,
    "email" VARCHAR(255),
    "staff_code" VARCHAR(60),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "bank_name" VARCHAR(150),
    "bank_account_name" VARCHAR(180),
    "bank_account_number" VARCHAR(60),
    "tax_identifier" VARCHAR(120),
    "pension_identifier" VARCHAR(120),
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_components" (
    "id" UUID NOT NULL,
    "chart_account_id" UUID,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "component_type" VARCHAR(20) NOT NULL,
    "calculation_type" VARCHAR(20) NOT NULL DEFAULT 'fixed',
    "is_taxable" BOOLEAN NOT NULL DEFAULT false,
    "is_statutory" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_worker_profiles" (
    "id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "pay_frequency" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "base_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_mode" VARCHAR(30),
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_worker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_worker_profile_components" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "amount" DECIMAL(15,2),
    "rate" DECIMAL(8,4),
    "formula" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_worker_profile_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_worker_allocations" (
    "id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "project_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "allocation_percent" DECIMAL(8,4) NOT NULL DEFAULT 100,
    "allocation_amount" DECIMAL(15,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_worker_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_runs" (
    "id" UUID NOT NULL,
    "paid_from_account_id" UUID,
    "workflow_instance_id" UUID,
    "name" VARCHAR(180) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "notes" TEXT,
    "prepared_by" BIGINT,
    "reviewed_by" BIGINT,
    "approved_by" BIGINT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_run_items" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "project_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "worker_type" VARCHAR(20) NOT NULL,
    "gross_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "employer_cost_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "payment_reference" VARCHAR(120),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_run_item_lines" (
    "id" UUID NOT NULL,
    "run_item_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "line_type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "quantity" DECIMAL(10,2),
    "rate" DECIMAL(10,4),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_run_item_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_run_item_allocations" (
    "id" UUID NOT NULL,
    "run_item_id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "project_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "allocation_percent" DECIMAL(8,4) NOT NULL DEFAULT 100,
    "allocation_amount" DECIMAL(15,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_run_item_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_accounting_postings" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "posted_by" BIGINT,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sta_payroll_accounting_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_payroll_settings" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "default_expense_account_id" UUID,
    "default_cash_account_id" UUID,
    "config" JSONB,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_payroll_workers_profile_id_idx" ON "sta_payroll_workers"("profile_id");

-- CreateIndex
CREATE INDEX "sta_payroll_workers_organization_id_idx" ON "sta_payroll_workers"("organization_id");

-- CreateIndex
CREATE INDEX "sta_payroll_workers_team_id_idx" ON "sta_payroll_workers"("team_id");

-- CreateIndex
CREATE INDEX "sta_payroll_workers_project_id_idx" ON "sta_payroll_workers"("project_id");

-- CreateIndex
CREATE INDEX "sta_payroll_workers_default_fund_id_idx" ON "sta_payroll_workers"("default_fund_id");

-- CreateIndex
CREATE INDEX "sta_payroll_workers_default_grant_id_idx" ON "sta_payroll_workers"("default_grant_id");

-- CreateIndex
CREATE INDEX "sta_payroll_workers_worker_type_status_idx" ON "sta_payroll_workers"("worker_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sta_payroll_components_code_key" ON "sta_payroll_components"("code");

-- CreateIndex
CREATE INDEX "sta_payroll_components_chart_account_id_idx" ON "sta_payroll_components"("chart_account_id");

-- CreateIndex
CREATE INDEX "sta_payroll_components_component_type_is_active_idx" ON "sta_payroll_components"("component_type", "is_active");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_profiles_worker_id_effective_from_effect_idx" ON "sta_payroll_worker_profiles"("worker_id", "effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_profile_components_component_id_idx" ON "sta_payroll_worker_profile_components"("component_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_payroll_worker_profile_components_profile_id_component__key" ON "sta_payroll_worker_profile_components"("profile_id", "component_id");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_allocations_worker_id_sort_order_idx" ON "sta_payroll_worker_allocations"("worker_id", "sort_order");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_allocations_organization_id_idx" ON "sta_payroll_worker_allocations"("organization_id");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_allocations_team_id_idx" ON "sta_payroll_worker_allocations"("team_id");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_allocations_project_id_idx" ON "sta_payroll_worker_allocations"("project_id");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_allocations_fund_id_idx" ON "sta_payroll_worker_allocations"("fund_id");

-- CreateIndex
CREATE INDEX "sta_payroll_worker_allocations_grant_id_idx" ON "sta_payroll_worker_allocations"("grant_id");

-- CreateIndex
CREATE INDEX "sta_payroll_runs_status_idx" ON "sta_payroll_runs"("status");

-- CreateIndex
CREATE INDEX "sta_payroll_runs_workflow_instance_id_idx" ON "sta_payroll_runs"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "sta_payroll_runs_paid_from_account_id_idx" ON "sta_payroll_runs"("paid_from_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_payroll_runs_year_month_key" ON "sta_payroll_runs"("year", "month");

-- CreateIndex
CREATE INDEX "sta_payroll_run_items_run_id_payment_status_idx" ON "sta_payroll_run_items"("run_id", "payment_status");

-- CreateIndex
CREATE INDEX "sta_payroll_run_items_organization_id_idx" ON "sta_payroll_run_items"("organization_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_items_team_id_idx" ON "sta_payroll_run_items"("team_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_items_project_id_idx" ON "sta_payroll_run_items"("project_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_items_fund_id_idx" ON "sta_payroll_run_items"("fund_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_items_grant_id_idx" ON "sta_payroll_run_items"("grant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_payroll_run_items_run_id_worker_id_key" ON "sta_payroll_run_items"("run_id", "worker_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_lines_run_item_id_idx" ON "sta_payroll_run_item_lines"("run_item_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_lines_component_id_idx" ON "sta_payroll_run_item_lines"("component_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_allocations_run_item_id_sort_order_idx" ON "sta_payroll_run_item_allocations"("run_item_id", "sort_order");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_allocations_organization_id_idx" ON "sta_payroll_run_item_allocations"("organization_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_allocations_team_id_idx" ON "sta_payroll_run_item_allocations"("team_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_allocations_project_id_idx" ON "sta_payroll_run_item_allocations"("project_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_allocations_fund_id_idx" ON "sta_payroll_run_item_allocations"("fund_id");

-- CreateIndex
CREATE INDEX "sta_payroll_run_item_allocations_grant_id_idx" ON "sta_payroll_run_item_allocations"("grant_id");

-- CreateIndex
CREATE INDEX "sta_payroll_accounting_postings_journal_entry_id_idx" ON "sta_payroll_accounting_postings"("journal_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_payroll_accounting_postings_run_id_journal_entry_id_key" ON "sta_payroll_accounting_postings"("run_id", "journal_entry_id");

-- CreateIndex
CREATE INDEX "sta_payroll_settings_default_expense_account_id_idx" ON "sta_payroll_settings"("default_expense_account_id");

-- CreateIndex
CREATE INDEX "sta_payroll_settings_default_cash_account_id_idx" ON "sta_payroll_settings"("default_cash_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_payroll_settings_organization_id_key" ON "sta_payroll_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "sta_payroll_workers" ADD CONSTRAINT "sta_payroll_workers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_workers" ADD CONSTRAINT "sta_payroll_workers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_workers" ADD CONSTRAINT "sta_payroll_workers_default_fund_id_fkey" FOREIGN KEY ("default_fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_workers" ADD CONSTRAINT "sta_payroll_workers_default_grant_id_fkey" FOREIGN KEY ("default_grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_components" ADD CONSTRAINT "sta_payroll_components_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_worker_profiles" ADD CONSTRAINT "sta_payroll_worker_profiles_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "sta_payroll_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_worker_profile_components" ADD CONSTRAINT "sta_payroll_worker_profile_components_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_payroll_worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_worker_profile_components" ADD CONSTRAINT "sta_payroll_worker_profile_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "sta_payroll_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_worker_allocations" ADD CONSTRAINT "sta_payroll_worker_allocations_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "sta_payroll_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_worker_allocations" ADD CONSTRAINT "sta_payroll_worker_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_worker_allocations" ADD CONSTRAINT "sta_payroll_worker_allocations_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_worker_allocations" ADD CONSTRAINT "sta_payroll_worker_allocations_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_runs" ADD CONSTRAINT "sta_payroll_runs_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_runs" ADD CONSTRAINT "sta_payroll_runs_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_runs" ADD CONSTRAINT "sta_payroll_runs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_runs" ADD CONSTRAINT "sta_payroll_runs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_items" ADD CONSTRAINT "sta_payroll_run_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "sta_payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_items" ADD CONSTRAINT "sta_payroll_run_items_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "sta_payroll_workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_items" ADD CONSTRAINT "sta_payroll_run_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_items" ADD CONSTRAINT "sta_payroll_run_items_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_items" ADD CONSTRAINT "sta_payroll_run_items_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_item_lines" ADD CONSTRAINT "sta_payroll_run_item_lines_run_item_id_fkey" FOREIGN KEY ("run_item_id") REFERENCES "sta_payroll_run_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_item_lines" ADD CONSTRAINT "sta_payroll_run_item_lines_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "sta_payroll_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_item_allocations" ADD CONSTRAINT "sta_payroll_run_item_allocations_run_item_id_fkey" FOREIGN KEY ("run_item_id") REFERENCES "sta_payroll_run_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_item_allocations" ADD CONSTRAINT "sta_payroll_run_item_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_item_allocations" ADD CONSTRAINT "sta_payroll_run_item_allocations_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_run_item_allocations" ADD CONSTRAINT "sta_payroll_run_item_allocations_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_accounting_postings" ADD CONSTRAINT "sta_payroll_accounting_postings_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "sta_payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_accounting_postings" ADD CONSTRAINT "sta_payroll_accounting_postings_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "sta_finance_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_settings" ADD CONSTRAINT "sta_payroll_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_settings" ADD CONSTRAINT "sta_payroll_settings_default_expense_account_id_fkey" FOREIGN KEY ("default_expense_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_settings" ADD CONSTRAINT "sta_payroll_settings_default_cash_account_id_fkey" FOREIGN KEY ("default_cash_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_settings" ADD CONSTRAINT "sta_payroll_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "sta_finance_payment_voucher_files_voucher_id_file_kind_sort_ord" RENAME TO "sta_finance_payment_voucher_files_voucher_id_file_kind_sort_idx";

-- RenameIndex
ALTER INDEX "unique_finance_payment_voucher_file" RENAME TO "sta_finance_payment_voucher_files_voucher_id_file_id_file_k_key";

-- RenameIndex
ALTER INDEX "unique_receipt_invoice_allocation" RENAME TO "sta_finance_receipt_allocations_receipt_id_sales_invoice_id_key";

-- RenameIndex
ALTER INDEX "unique_request_item_file" RENAME TO "sta_request_item_files_request_item_id_file_id_key";
