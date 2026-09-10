-- ============================================================
-- Statutory Deductions & WHT Tracking
-- ============================================================

-- 1. DeductionType master table
CREATE TABLE "sta_finance_deduction_types" (
    "id"              UUID         NOT NULL,
    "name"            VARCHAR(100) NOT NULL,
    "code"            VARCHAR(30)  NOT NULL,
    "rate"            DECIMAL(6,4) NOT NULL DEFAULT 0,
    "applies_to"      VARCHAR(50)  NOT NULL DEFAULT 'vendor',
    "gl_account_id"   UUID,
    "is_active"       BOOLEAN      NOT NULL DEFAULT true,
    "organization_id" BIGINT,
    "created_by"      BIGINT       NOT NULL,
    "updated_by"      BIGINT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sta_finance_deduction_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sta_finance_deduction_types_code_org_key"
    ON "sta_finance_deduction_types"("code", "organization_id");
CREATE INDEX "sta_finance_deduction_types_is_active_idx"
    ON "sta_finance_deduction_types"("is_active");

-- 2. PV Deduction line items
CREATE TABLE "sta_finance_pv_deductions" (
    "id"                 UUID          NOT NULL,
    "payment_voucher_id" UUID          NOT NULL,
    "deduction_type_id"  UUID          NOT NULL,
    "rate"               DECIMAL(6,4)  NOT NULL,
    "gross_amount"       DECIMAL(15,2) NOT NULL,
    "deduction_amount"   DECIMAL(15,2) NOT NULL,
    "created_by"         BIGINT        NOT NULL,
    "created_at"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "sta_finance_pv_deductions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_finance_pv_deductions_pv_idx"
    ON "sta_finance_pv_deductions"("payment_voucher_id");

-- 3. Vendor WHT Accruals (one row per deduction applied on a PV)
CREATE TABLE "sta_finance_vendor_wht_accruals" (
    "id"                 UUID          NOT NULL,
    "vendor_id"          UUID          NOT NULL,
    "payment_voucher_id" UUID          NOT NULL,
    "pv_deduction_id"    UUID          NOT NULL,
    "deduction_type_id"  UUID          NOT NULL,
    "period_year"        INTEGER       NOT NULL,
    "period_month"       INTEGER       NOT NULL,
    "gross_amount"       DECIMAL(15,2) NOT NULL,
    "withheld_amount"    DECIMAL(15,2) NOT NULL,
    "remittance_id"      UUID,
    "remitted_at"        TIMESTAMP(3),
    "organization_id"    BIGINT,
    "created_at"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "sta_finance_vendor_wht_accruals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sta_finance_vendor_wht_accruals_pv_deduction_key"
    ON "sta_finance_vendor_wht_accruals"("pv_deduction_id");
CREATE INDEX "sta_finance_vendor_wht_accruals_vendor_idx"
    ON "sta_finance_vendor_wht_accruals"("vendor_id");
CREATE INDEX "sta_finance_vendor_wht_accruals_period_idx"
    ON "sta_finance_vendor_wht_accruals"("period_year", "period_month");
CREATE INDEX "sta_finance_vendor_wht_accruals_remittance_idx"
    ON "sta_finance_vendor_wht_accruals"("remittance_id");

-- 4. WHT Remittance batches
CREATE TABLE "sta_finance_wht_remittances" (
    "id"                   UUID          NOT NULL,
    "remittance_number"    VARCHAR(60)   NOT NULL,
    "deduction_type_id"    UUID          NOT NULL,
    "period_year"          INTEGER       NOT NULL,
    "period_month"         INTEGER       NOT NULL,
    "total_amount"         DECIMAL(15,2) NOT NULL,
    "paid_from_account_id" UUID          NOT NULL,
    "remittance_date"      DATE          NOT NULL,
    "reference"            VARCHAR(120),
    "receipt_file_id"      UUID,
    "status"               VARCHAR(20)   NOT NULL DEFAULT 'pending',
    "notes"                TEXT,
    "organization_id"      BIGINT,
    "created_by"           BIGINT        NOT NULL,
    "updated_by"           BIGINT,
    "created_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "sta_finance_wht_remittances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sta_finance_wht_remittances_number_key"
    ON "sta_finance_wht_remittances"("remittance_number");
CREATE INDEX "sta_finance_wht_remittances_period_idx"
    ON "sta_finance_wht_remittances"("period_year", "period_month");
CREATE INDEX "sta_finance_wht_remittances_type_idx"
    ON "sta_finance_wht_remittances"("deduction_type_id");

-- 5. Add vendor + gross/net to payment vouchers
ALTER TABLE "sta_finance_payment_vouchers"
    ADD COLUMN IF NOT EXISTS "vendor_id"    UUID,
    ADD COLUMN IF NOT EXISTS "gross_amount" DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS "net_amount"   DECIMAL(15,2);

CREATE INDEX "sta_finance_payment_vouchers_vendor_idx"
    ON "sta_finance_payment_vouchers"("vendor_id");

-- 6. Add vendor to request instances (optional — for procurement requests)
ALTER TABLE "sta_request_instances"
    ADD COLUMN IF NOT EXISTS "vendor_id" UUID;

-- Foreign keys
ALTER TABLE "sta_finance_deduction_types"
    ADD CONSTRAINT "sta_finance_deduction_types_gl_account_fkey"
        FOREIGN KEY ("gl_account_id") REFERENCES "sta_finance_chart_accounts"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "sta_finance_deduction_types_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT;

ALTER TABLE "sta_finance_pv_deductions"
    ADD CONSTRAINT "sta_finance_pv_deductions_pv_fkey"
        FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "sta_finance_pv_deductions_type_fkey"
        FOREIGN KEY ("deduction_type_id") REFERENCES "sta_finance_deduction_types"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "sta_finance_pv_deductions_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT;

ALTER TABLE "sta_finance_vendor_wht_accruals"
    ADD CONSTRAINT "sta_finance_vendor_wht_accruals_vendor_fkey"
        FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_vendors"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "sta_finance_vendor_wht_accruals_pv_fkey"
        FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "sta_finance_vendor_wht_accruals_pv_deduction_fkey"
        FOREIGN KEY ("pv_deduction_id") REFERENCES "sta_finance_pv_deductions"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "sta_finance_vendor_wht_accruals_type_fkey"
        FOREIGN KEY ("deduction_type_id") REFERENCES "sta_finance_deduction_types"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "sta_finance_vendor_wht_accruals_remittance_fkey"
        FOREIGN KEY ("remittance_id") REFERENCES "sta_finance_wht_remittances"("id") ON DELETE SET NULL;

ALTER TABLE "sta_finance_wht_remittances"
    ADD CONSTRAINT "sta_finance_wht_remittances_type_fkey"
        FOREIGN KEY ("deduction_type_id") REFERENCES "sta_finance_deduction_types"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "sta_finance_wht_remittances_account_fkey"
        FOREIGN KEY ("paid_from_account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "sta_finance_wht_remittances_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT;

ALTER TABLE "sta_finance_payment_vouchers"
    ADD CONSTRAINT "sta_finance_payment_vouchers_vendor_fkey"
        FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_vendors"("id") ON DELETE SET NULL;

ALTER TABLE "sta_request_instances"
    ADD CONSTRAINT "sta_request_instances_vendor_fkey"
        FOREIGN KEY ("vendor_id") REFERENCES "sta_finance_vendors"("id") ON DELETE SET NULL;
