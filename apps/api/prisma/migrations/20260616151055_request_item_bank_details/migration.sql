/*
  Warnings:

  - A unique constraint covering the columns `[organization_id,year,month]` on the table `sta_payroll_runs` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "sta_finance_deduction_types" DROP CONSTRAINT "sta_finance_deduction_types_created_by_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_deduction_types" DROP CONSTRAINT "sta_finance_deduction_types_gl_account_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_pv_deductions" DROP CONSTRAINT "sta_finance_pv_deductions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_pv_deductions" DROP CONSTRAINT "sta_finance_pv_deductions_pv_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_pv_deductions" DROP CONSTRAINT "sta_finance_pv_deductions_type_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" DROP CONSTRAINT "sta_finance_vendor_wht_accruals_pv_deduction_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" DROP CONSTRAINT "sta_finance_vendor_wht_accruals_pv_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" DROP CONSTRAINT "sta_finance_vendor_wht_accruals_remittance_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" DROP CONSTRAINT "sta_finance_vendor_wht_accruals_type_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_wht_remittances" DROP CONSTRAINT "sta_finance_wht_remittances_account_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_wht_remittances" DROP CONSTRAINT "sta_finance_wht_remittances_created_by_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_wht_remittances" DROP CONSTRAINT "sta_finance_wht_remittances_type_fkey";

-- DropForeignKey
ALTER TABLE "sta_request_types" DROP CONSTRAINT "sta_request_types_category_id_fkey";

-- DropIndex
DROP INDEX "sta_finance_deduction_types_code_org_key";

-- DropIndex
DROP INDEX "sta_finance_receipts_sales_invoice_id_idx";

-- DropIndex
DROP INDEX "sta_payroll_runs_year_month_key";

-- DropIndex
DROP INDEX "sta_request_categories_group_id_idx";

-- DropIndex
DROP INDEX "sta_request_instances_contact_id_idx";

-- DropIndex
DROP INDEX "sta_request_types_category_id_idx";

-- AlterTable
ALTER TABLE "sta_attendance_corrections" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_attendance_exceptions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_attendance_holidays" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_finance_budget_assumptions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_finance_budget_portfolio" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_finance_contact_persons" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sta_finance_contacts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sta_finance_deduction_types" ALTER COLUMN "rate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_finance_journal_sequences" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_finance_payment_voucher_corrections" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_office_locations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_payroll_loan_repayments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_payroll_loans" ADD COLUMN     "request_id" BIGINT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_payroll_run_timesheet_allocations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_payroll_runs" ADD COLUMN     "authorization_notes" TEXT,
ADD COLUMN     "authorized_at" TIMESTAMP(3),
ADD COLUMN     "authorized_by" BIGINT,
ADD COLUMN     "organization_id" BIGINT;

-- AlterTable
ALTER TABLE "sta_payroll_tax_bands" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_payroll_tax_tables" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_project_timesheet_entries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sta_request_categories" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sta_request_items" ADD COLUMN     "account_name" VARCHAR(120),
ADD COLUMN     "account_number" VARCHAR(50),
ADD COLUMN     "bank_name" VARCHAR(120);

-- AlterTable
ALTER TABLE "sta_request_types" ALTER COLUMN "taxonomy_keys" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sta_finance_payment_voucher_items" (
    "id" UUID NOT NULL,
    "payment_voucher_id" UUID NOT NULL,
    "request_item_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sta_finance_payment_voucher_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_payment_voucher_items_payment_voucher_id_idx" ON "sta_finance_payment_voucher_items"("payment_voucher_id");

-- CreateIndex
CREATE INDEX "sta_finance_payment_voucher_items_request_item_id_idx" ON "sta_finance_payment_voucher_items"("request_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_payment_voucher_items_payment_voucher_id_reques_key" ON "sta_finance_payment_voucher_items"("payment_voucher_id", "request_item_id");

-- CreateIndex
CREATE INDEX "sta_payroll_loans_request_id_idx" ON "sta_payroll_loans"("request_id");

-- CreateIndex
CREATE INDEX "sta_payroll_runs_organization_id_idx" ON "sta_payroll_runs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_payroll_runs_organization_id_year_month_key" ON "sta_payroll_runs"("organization_id", "year", "month");

-- AddForeignKey
ALTER TABLE "sta_request_types" ADD CONSTRAINT "sta_request_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "sta_request_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_instances" ADD CONSTRAINT "sta_request_instances_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_runs" ADD CONSTRAINT "sta_payroll_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_runs" ADD CONSTRAINT "sta_payroll_runs_authorized_by_fkey" FOREIGN KEY ("authorized_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_payroll_loans" ADD CONSTRAINT "sta_payroll_loans_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sta_request_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_payment_voucher_items" ADD CONSTRAINT "sta_finance_payment_voucher_items_payment_voucher_id_fkey" FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_payment_voucher_items" ADD CONSTRAINT "sta_finance_payment_voucher_items_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "sta_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_deduction_types" ADD CONSTRAINT "sta_finance_deduction_types_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_deduction_types" ADD CONSTRAINT "sta_finance_deduction_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_deduction_types" ADD CONSTRAINT "sta_finance_deduction_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_pv_deductions" ADD CONSTRAINT "sta_finance_pv_deductions_payment_voucher_id_fkey" FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_pv_deductions" ADD CONSTRAINT "sta_finance_pv_deductions_deduction_type_id_fkey" FOREIGN KEY ("deduction_type_id") REFERENCES "sta_finance_deduction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_pv_deductions" ADD CONSTRAINT "sta_finance_pv_deductions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" ADD CONSTRAINT "sta_finance_vendor_wht_accruals_payment_voucher_id_fkey" FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" ADD CONSTRAINT "sta_finance_vendor_wht_accruals_pv_deduction_id_fkey" FOREIGN KEY ("pv_deduction_id") REFERENCES "sta_finance_pv_deductions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" ADD CONSTRAINT "sta_finance_vendor_wht_accruals_deduction_type_id_fkey" FOREIGN KEY ("deduction_type_id") REFERENCES "sta_finance_deduction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_vendor_wht_accruals" ADD CONSTRAINT "sta_finance_vendor_wht_accruals_remittance_id_fkey" FOREIGN KEY ("remittance_id") REFERENCES "sta_finance_wht_remittances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_wht_remittances" ADD CONSTRAINT "sta_finance_wht_remittances_deduction_type_id_fkey" FOREIGN KEY ("deduction_type_id") REFERENCES "sta_finance_deduction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_wht_remittances" ADD CONSTRAINT "sta_finance_wht_remittances_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_wht_remittances" ADD CONSTRAINT "sta_finance_wht_remittances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_wht_remittances" ADD CONSTRAINT "sta_finance_wht_remittances_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "unique_finance_contact_name_per_org" RENAME TO "sta_finance_contacts_organization_id_name_key";

-- RenameIndex
ALTER INDEX "unique_finance_journal_sequence_prefix_year" RENAME TO "sta_finance_journal_sequences_prefix_sequence_year_key";

-- RenameIndex
ALTER INDEX "sta_finance_pv_deductions_pv_idx" RENAME TO "sta_finance_pv_deductions_payment_voucher_id_idx";

-- RenameIndex
ALTER INDEX "sta_finance_vendor_wht_accruals_period_idx" RENAME TO "sta_finance_vendor_wht_accruals_period_year_period_month_idx";

-- RenameIndex
ALTER INDEX "sta_finance_vendor_wht_accruals_pv_deduction_key" RENAME TO "sta_finance_vendor_wht_accruals_pv_deduction_id_key";

-- RenameIndex
ALTER INDEX "sta_finance_vendor_wht_accruals_remittance_idx" RENAME TO "sta_finance_vendor_wht_accruals_remittance_id_idx";

-- RenameIndex
ALTER INDEX "sta_finance_wht_remittances_number_key" RENAME TO "sta_finance_wht_remittances_remittance_number_key";

-- RenameIndex
ALTER INDEX "sta_finance_wht_remittances_period_idx" RENAME TO "sta_finance_wht_remittances_period_year_period_month_idx";

-- RenameIndex
ALTER INDEX "sta_finance_wht_remittances_type_idx" RENAME TO "sta_finance_wht_remittances_deduction_type_id_idx";

-- RenameIndex
ALTER INDEX "unique_group_organization" RENAME TO "sta_group_organizations_group_id_organization_id_key";

-- RenameIndex
ALTER INDEX "unique_group_user_organization_scope" RENAME TO "sta_group_user_organization_scopes_group_user_id_organizati_key";

-- RenameIndex
ALTER INDEX "unique_org_office_location" RENAME TO "sta_organization_office_locations_organization_id_office_lo_key";

-- RenameIndex
ALTER INDEX "sta_payroll_run_timesheet_allocations_run_id_worker_id_sort_ord" RENAME TO "sta_payroll_run_timesheet_allocations_run_id_worker_id_sort_idx";
