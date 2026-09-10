-- AlterTable
ALTER TABLE "sta_finance_income_entries" ADD COLUMN     "revenue_account_id" UUID;

-- AlterTable
ALTER TABLE "sta_finance_payment_vouchers" ADD COLUMN     "expense_account_id" UUID;

-- CreateTable
CREATE TABLE "sta_finance_chart_accounts" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "finance_account_id" UUID,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "normal_balance" VARCHAR(10) NOT NULL,
    "is_control_account" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_reporting_periods" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_reporting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_journal_entries" (
    "id" UUID NOT NULL,
    "entry_no" VARCHAR(60) NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "period_id" UUID NOT NULL,
    "source_type" VARCHAR(60),
    "source_id" VARCHAR(120),
    "memo" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'posted',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "total_debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "posted_by" BIGINT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_journal_lines" (
    "id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "chart_account_id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "description" VARCHAR(255),
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_customers" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(40),
    "address" TEXT,
    "tax_number" VARCHAR(80),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_vendors" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(40),
    "address" TEXT,
    "tax_number" VARCHAR(80),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_sales_invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(60) NOT NULL,
    "customer_id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_sales_invoice_lines" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "chart_account_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_sales_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_receipts" (
    "id" UUID NOT NULL,
    "receipt_number" VARCHAR(60) NOT NULL,
    "customer_id" UUID,
    "sales_invoice_id" UUID,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "received_at" TIMESTAMP(3) NOT NULL,
    "reference" VARCHAR(120),
    "notes" TEXT,
    "metadata" JSONB,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_bill_headers" (
    "id" UUID NOT NULL,
    "bill_number" VARCHAR(60) NOT NULL,
    "vendor_id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "bill_date" DATE NOT NULL,
    "due_date" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_bill_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_bill_lines" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "chart_account_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_vendor_payments" (
    "id" UUID NOT NULL,
    "payment_number" VARCHAR(60) NOT NULL,
    "vendor_id" UUID,
    "bill_id" UUID,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "reference" VARCHAR(120),
    "notes" TEXT,
    "metadata" JSONB,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_report_notes" (
    "id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "report_key" VARCHAR(80) NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'generated',
    "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
    "title" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "source_rule" VARCHAR(120),
    "is_overridden" BOOLEAN NOT NULL DEFAULT false,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_report_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_chart_accounts_finance_account_id_key" ON "sta_finance_chart_accounts"("finance_account_id");

-- CreateIndex
CREATE INDEX "sta_finance_chart_accounts_type_idx" ON "sta_finance_chart_accounts"("type");

-- CreateIndex
CREATE INDEX "sta_finance_chart_accounts_category_idx" ON "sta_finance_chart_accounts"("category");

-- CreateIndex
CREATE INDEX "sta_finance_chart_accounts_is_active_idx" ON "sta_finance_chart_accounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_chart_accounts_organization_id_code_key" ON "sta_finance_chart_accounts"("organization_id", "code");

-- CreateIndex
CREATE INDEX "sta_finance_reporting_periods_quarter_idx" ON "sta_finance_reporting_periods"("quarter");

-- CreateIndex
CREATE INDEX "sta_finance_reporting_periods_status_idx" ON "sta_finance_reporting_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_reporting_periods_year_month_key" ON "sta_finance_reporting_periods"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_journal_entries_entry_no_key" ON "sta_finance_journal_entries"("entry_no");

-- CreateIndex
CREATE INDEX "sta_finance_journal_entries_period_id_idx" ON "sta_finance_journal_entries"("period_id");

-- CreateIndex
CREATE INDEX "sta_finance_journal_entries_entry_date_idx" ON "sta_finance_journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "sta_finance_journal_entries_source_type_source_id_idx" ON "sta_finance_journal_entries"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "sta_finance_journal_lines_journal_entry_id_idx" ON "sta_finance_journal_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "sta_finance_journal_lines_chart_account_id_idx" ON "sta_finance_journal_lines"("chart_account_id");

-- CreateIndex
CREATE INDEX "sta_finance_journal_lines_organization_id_idx" ON "sta_finance_journal_lines"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_journal_lines_team_id_idx" ON "sta_finance_journal_lines"("team_id");

-- CreateIndex
CREATE INDEX "sta_finance_customers_is_active_idx" ON "sta_finance_customers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_customers_organization_id_name_key" ON "sta_finance_customers"("organization_id", "name");

-- CreateIndex
CREATE INDEX "sta_finance_vendors_is_active_idx" ON "sta_finance_vendors"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_vendors_organization_id_name_key" ON "sta_finance_vendors"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_sales_invoices_invoice_number_key" ON "sta_finance_sales_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_customer_id_idx" ON "sta_finance_sales_invoices"("customer_id");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_organization_id_idx" ON "sta_finance_sales_invoices"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_team_id_idx" ON "sta_finance_sales_invoices"("team_id");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_status_idx" ON "sta_finance_sales_invoices"("status");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_invoice_date_idx" ON "sta_finance_sales_invoices"("invoice_date");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoices_due_date_idx" ON "sta_finance_sales_invoices"("due_date");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoice_lines_invoice_id_idx" ON "sta_finance_sales_invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "sta_finance_sales_invoice_lines_chart_account_id_idx" ON "sta_finance_sales_invoice_lines"("chart_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_receipts_receipt_number_key" ON "sta_finance_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "sta_finance_receipts_customer_id_idx" ON "sta_finance_receipts"("customer_id");

-- CreateIndex
CREATE INDEX "sta_finance_receipts_sales_invoice_id_idx" ON "sta_finance_receipts"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "sta_finance_receipts_account_id_idx" ON "sta_finance_receipts"("account_id");

-- CreateIndex
CREATE INDEX "sta_finance_receipts_received_at_idx" ON "sta_finance_receipts"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_bill_headers_bill_number_key" ON "sta_finance_bill_headers"("bill_number");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_vendor_id_idx" ON "sta_finance_bill_headers"("vendor_id");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_organization_id_idx" ON "sta_finance_bill_headers"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_team_id_idx" ON "sta_finance_bill_headers"("team_id");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_status_idx" ON "sta_finance_bill_headers"("status");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_bill_date_idx" ON "sta_finance_bill_headers"("bill_date");

-- CreateIndex
CREATE INDEX "sta_finance_bill_headers_due_date_idx" ON "sta_finance_bill_headers"("due_date");

-- CreateIndex
CREATE INDEX "sta_finance_bill_lines_bill_id_idx" ON "sta_finance_bill_lines"("bill_id");

-- CreateIndex
CREATE INDEX "sta_finance_bill_lines_chart_account_id_idx" ON "sta_finance_bill_lines"("chart_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_vendor_payments_payment_number_key" ON "sta_finance_vendor_payments"("payment_number");

-- CreateIndex
CREATE INDEX "sta_finance_vendor_payments_vendor_id_idx" ON "sta_finance_vendor_payments"("vendor_id");

-- CreateIndex
CREATE INDEX "sta_finance_vendor_payments_bill_id_idx" ON "sta_finance_vendor_payments"("bill_id");

-- CreateIndex
CREATE INDEX "sta_finance_vendor_payments_account_id_idx" ON "sta_finance_vendor_payments"("account_id");

-- CreateIndex
CREATE INDEX "sta_finance_vendor_payments_paid_at_idx" ON "sta_finance_vendor_payments"("paid_at");

-- CreateIndex
CREATE INDEX "sta_finance_report_notes_period_id_report_key_idx" ON "sta_finance_report_notes"("period_id", "report_key");

-- CreateIndex
CREATE INDEX "sta_finance_income_entries_revenue_account_id_idx" ON "sta_finance_income_entries"("revenue_account_id");

-- CreateIndex
CREATE INDEX "sta_finance_payment_vouchers_expense_account_id_idx" ON "sta_finance_payment_vouchers"("expense_account_id");

-- AddForeignKey
ALTER TABLE "sta_finance_chart_accounts" ADD CONSTRAINT "sta_finance_chart_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_chart_accounts" ADD CONSTRAINT "sta_finance_chart_accounts_finance_account_id_fkey" FOREIGN KEY ("finance_account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_chart_accounts" ADD CONSTRAINT "sta_finance_chart_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_reporting_periods" ADD CONSTRAINT "sta_finance_reporting_periods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_entries" ADD CONSTRAINT "sta_finance_journal_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "sta_finance_reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_entries" ADD CONSTRAINT "sta_finance_journal_entries_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_lines" ADD CONSTRAINT "sta_finance_journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "sta_finance_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_lines" ADD CONSTRAINT "sta_finance_journal_lines_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_lines" ADD CONSTRAINT "sta_finance_journal_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_journal_lines" ADD CONSTRAINT "sta_finance_journal_lines_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_income_entries" ADD CONSTRAINT "sta_finance_income_entries_revenue_account_id_fkey" FOREIGN KEY ("revenue_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_customers" ADD CONSTRAINT "sta_finance_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_customers" ADD CONSTRAINT "sta_finance_customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_customers" ADD CONSTRAINT "sta_finance_customers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendors" ADD CONSTRAINT "sta_finance_vendors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendors" ADD CONSTRAINT "sta_finance_vendors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendors" ADD CONSTRAINT "sta_finance_vendors_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sta_finance_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoice_lines" ADD CONSTRAINT "sta_finance_sales_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sta_finance_sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_sales_invoice_lines" ADD CONSTRAINT "sta_finance_sales_invoice_lines_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_receipts" ADD CONSTRAINT "sta_finance_receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sta_finance_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_receipts" ADD CONSTRAINT "sta_finance_receipts_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sta_finance_sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_receipts" ADD CONSTRAINT "sta_finance_receipts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_receipts" ADD CONSTRAINT "sta_finance_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_lines" ADD CONSTRAINT "sta_finance_bill_lines_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "sta_finance_bill_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_bill_lines" ADD CONSTRAINT "sta_finance_bill_lines_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_payments" ADD CONSTRAINT "sta_finance_vendor_payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_payments" ADD CONSTRAINT "sta_finance_vendor_payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "sta_finance_bill_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_payments" ADD CONSTRAINT "sta_finance_vendor_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_payments" ADD CONSTRAINT "sta_finance_vendor_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_report_notes" ADD CONSTRAINT "sta_finance_report_notes_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "sta_finance_reporting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_report_notes" ADD CONSTRAINT "sta_finance_report_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_report_notes" ADD CONSTRAINT "sta_finance_report_notes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_payment_vouchers" ADD CONSTRAINT "sta_finance_payment_vouchers_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
