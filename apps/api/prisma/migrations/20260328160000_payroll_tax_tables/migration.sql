ALTER TABLE "sta_payroll_workers"
ADD COLUMN "tax_table_id" UUID;

ALTER TABLE "sta_payroll_settings"
ADD COLUMN "employee_tax_table_id" UUID;

CREATE TABLE "sta_payroll_tax_tables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" BIGINT,
  "name" VARCHAR(180) NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "worker_type" VARCHAR(20) NOT NULL DEFAULT 'employee',
  "periodicity" VARCHAR(20) NOT NULL DEFAULT 'monthly',
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "fixed_relief_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "gross_relief_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "minimum_relief_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "pension_relief_enabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sta_payroll_tax_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sta_payroll_tax_bands" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "table_id" UUID NOT NULL,
  "lower_bound" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "upper_bound" DECIMAL(15,2),
  "rate" DECIMAL(8,4) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sta_payroll_tax_bands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sta_payroll_tax_tables_code_key" ON "sta_payroll_tax_tables"("code");
CREATE INDEX "sta_payroll_tax_tables_organization_id_worker_type_status_idx" ON "sta_payroll_tax_tables"("organization_id", "worker_type", "status");
CREATE INDEX "sta_payroll_tax_tables_effective_from_effective_to_idx" ON "sta_payroll_tax_tables"("effective_from", "effective_to");
CREATE INDEX "sta_payroll_tax_bands_table_id_sort_order_idx" ON "sta_payroll_tax_bands"("table_id", "sort_order");
CREATE INDEX "sta_payroll_workers_tax_table_id_idx" ON "sta_payroll_workers"("tax_table_id");
CREATE INDEX "sta_payroll_settings_employee_tax_table_id_idx" ON "sta_payroll_settings"("employee_tax_table_id");

ALTER TABLE "sta_payroll_tax_bands"
ADD CONSTRAINT "sta_payroll_tax_bands_table_id_fkey"
FOREIGN KEY ("table_id") REFERENCES "sta_payroll_tax_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_workers"
ADD CONSTRAINT "sta_payroll_workers_tax_table_id_fkey"
FOREIGN KEY ("tax_table_id") REFERENCES "sta_payroll_tax_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_settings"
ADD CONSTRAINT "sta_payroll_settings_employee_tax_table_id_fkey"
FOREIGN KEY ("employee_tax_table_id") REFERENCES "sta_payroll_tax_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
