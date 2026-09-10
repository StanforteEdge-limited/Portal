/*
  Warnings:

  - A unique constraint covering the columns `[current_active_revision_id]` on the table `sta_finance_budgets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[draft_revision_id]` on the table `sta_finance_budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProcurementCategory" AS ENUM ('goods', 'services', 'works');

-- CreateEnum
CREATE TYPE "PaymentPattern" AS ENUM ('post_delivery', 'pre_payment', 'milestone');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'returned', 'converted_to_po', 'cancelled');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'sent', 'acknowledged', 'partially_received', 'received', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "GrnStatus" AS ENUM ('pending', 'confirmed', 'disputed');

-- DropForeignKey
ALTER TABLE "sta_finance_budget_revision_lines" DROP CONSTRAINT "sta_finance_budget_revision_lines_budget_revision_id_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_budget_revisions" DROP CONSTRAINT "sta_finance_budget_revisions_budget_id_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_budget_revisions" DROP CONSTRAINT "sta_finance_budget_revisions_copied_from_revision_id_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_budgets" DROP CONSTRAINT "sta_finance_budgets_current_active_revision_id_fkey";

-- DropForeignKey
ALTER TABLE "sta_finance_budgets" DROP CONSTRAINT "sta_finance_budgets_draft_revision_id_fkey";

-- AlterTable
ALTER TABLE "sta_finance_budget_revision_lines" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sta_finance_budget_revisions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "submitted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "approved_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sta_procurement_requisitions" (
    "id" UUID NOT NULL,
    "requisition_number" VARCHAR(30) NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "requested_by" BIGINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" "ProcurementCategory" NOT NULL,
    "payment_pattern" "PaymentPattern" NOT NULL DEFAULT 'post_delivery',
    "items" JSONB NOT NULL,
    "estimated_total" DECIMAL(15,2) NOT NULL,
    "justification" TEXT,
    "budget_line_id" UUID,
    "workflow_instance_id" UUID,
    "status" "ProcurementStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_procurement_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_procurement_orders" (
    "id" UUID NOT NULL,
    "po_number" VARCHAR(30) NOT NULL,
    "requisition_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "prepared_by" BIGINT NOT NULL,
    "organization_id" BIGINT,
    "items" JSONB NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "payment_pattern" "PaymentPattern" NOT NULL DEFAULT 'post_delivery',
    "milestones" JSONB,
    "payment_terms" VARCHAR(100),
    "delivery_date" DATE,
    "delivery_address" TEXT,
    "workflow_instance_id" UUID,
    "status" "PoStatus" NOT NULL DEFAULT 'draft',
    "vendor_acknowledged_at" TIMESTAMP(3),
    "vendor_acknowledge_note" TEXT,
    "pdf_file_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_procurement_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_procurement_grns" (
    "id" UUID NOT NULL,
    "grn_number" VARCHAR(30) NOT NULL,
    "po_id" UUID NOT NULL,
    "raised_by" BIGINT NOT NULL,
    "received_date" DATE NOT NULL,
    "items" JSONB NOT NULL,
    "overall_condition" VARCHAR(20) NOT NULL DEFAULT 'satisfactory',
    "notes" TEXT,
    "confirmed_by_officer" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" BIGINT,
    "status" "GrnStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_procurement_grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_vendor_portal_users" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "hashed_password" TEXT,
    "name" VARCHAR(120) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_vendor_portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_procurement_requisitions_requisition_number_key" ON "sta_procurement_requisitions"("requisition_number");

-- CreateIndex
CREATE INDEX "sta_procurement_requisitions_requested_by_idx" ON "sta_procurement_requisitions"("requested_by");

-- CreateIndex
CREATE INDEX "sta_procurement_requisitions_status_idx" ON "sta_procurement_requisitions"("status");

-- CreateIndex
CREATE INDEX "sta_procurement_requisitions_organization_id_idx" ON "sta_procurement_requisitions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_procurement_orders_po_number_key" ON "sta_procurement_orders"("po_number");

-- CreateIndex
CREATE INDEX "sta_procurement_orders_requisition_id_idx" ON "sta_procurement_orders"("requisition_id");

-- CreateIndex
CREATE INDEX "sta_procurement_orders_vendor_id_idx" ON "sta_procurement_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "sta_procurement_orders_status_idx" ON "sta_procurement_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sta_procurement_grns_grn_number_key" ON "sta_procurement_grns"("grn_number");

-- CreateIndex
CREATE INDEX "sta_procurement_grns_po_id_idx" ON "sta_procurement_grns"("po_id");

-- CreateIndex
CREATE INDEX "sta_procurement_grns_status_idx" ON "sta_procurement_grns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sta_vendor_portal_users_email_key" ON "sta_vendor_portal_users"("email");

-- CreateIndex
CREATE INDEX "sta_vendor_portal_users_vendor_id_idx" ON "sta_vendor_portal_users"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_budgets_current_active_revision_id_key" ON "sta_finance_budgets"("current_active_revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_budgets_draft_revision_id_key" ON "sta_finance_budgets"("draft_revision_id");

-- AddForeignKey
ALTER TABLE "sta_finance_budgets" ADD CONSTRAINT "sta_finance_budgets_current_active_revision_id_fkey" FOREIGN KEY ("current_active_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budgets" ADD CONSTRAINT "sta_finance_budgets_draft_revision_id_fkey" FOREIGN KEY ("draft_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budget_revisions" ADD CONSTRAINT "sta_finance_budget_revisions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "sta_finance_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budget_revisions" ADD CONSTRAINT "sta_finance_budget_revisions_copied_from_revision_id_fkey" FOREIGN KEY ("copied_from_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budget_revision_lines" ADD CONSTRAINT "sta_finance_budget_revision_lines_budget_revision_id_fkey" FOREIGN KEY ("budget_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_requisitions" ADD CONSTRAINT "sta_procurement_requisitions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_requisitions" ADD CONSTRAINT "sta_procurement_requisitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_requisitions" ADD CONSTRAINT "sta_procurement_requisitions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_orders" ADD CONSTRAINT "sta_procurement_orders_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "sta_procurement_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_orders" ADD CONSTRAINT "sta_procurement_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_orders" ADD CONSTRAINT "sta_procurement_orders_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_orders" ADD CONSTRAINT "sta_procurement_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_grns" ADD CONSTRAINT "sta_procurement_grns_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "sta_procurement_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_grns" ADD CONSTRAINT "sta_procurement_grns_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_grns" ADD CONSTRAINT "sta_procurement_grns_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_vendor_portal_users" ADD CONSTRAINT "sta_vendor_portal_users_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "sta_finance_budget_revision_lines_budget_revision_id_sort_order" RENAME TO "sta_finance_budget_revision_lines_budget_revision_id_sort_o_idx";
