ALTER TABLE "sta_payroll_workers" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_payroll_runs" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_procurement_requisitions" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_procurement_orders" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_accounts" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_funds" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_budgets" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_expenses" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_payroll_workers" p
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE p."organization_id" = to2."organization_id"
  AND p."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_payroll_runs" p
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE p."organization_id" = to2."organization_id"
  AND p."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_procurement_requisitions" p
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE p."organization_id" = to2."organization_id"
  AND p."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_procurement_orders" p
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE p."organization_id" = to2."organization_id"
  AND p."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_finance_accounts" f
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE f."organization_id" = to2."organization_id"
  AND f."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_finance_funds" f
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE f."organization_id" = to2."organization_id"
  AND f."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_finance_budgets" f
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE f."organization_id" = to2."organization_id"
  AND f."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_finance_expenses" f
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE f."organization_id" = to2."organization_id"
  AND f."tenant_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "payrollWorker_index_tenantId" ON "sta_payroll_workers" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "payrollRun_index_tenantId" ON "sta_payroll_runs" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "procurementRequisition_index_tenantId" ON "sta_procurement_requisitions" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "procurementOrder_index_tenantId" ON "sta_procurement_orders" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeAccount_index_tenantId" ON "sta_finance_accounts" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeFund_index_tenantId" ON "sta_finance_funds" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeBudget_index_tenantId" ON "sta_finance_budgets" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeExpense_index_tenantId" ON "sta_finance_expenses" ("tenant_id");
