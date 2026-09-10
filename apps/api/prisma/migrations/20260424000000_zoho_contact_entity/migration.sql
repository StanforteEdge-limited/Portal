-- 1. Create sta_finance_contacts table
CREATE TABLE "sta_finance_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" BigInt,
    "contact_type" VARCHAR(20) NOT NULL DEFAULT 'customer',
    "sub_type" VARCHAR(20) NOT NULL DEFAULT 'business',
    "name" VARCHAR(150) NOT NULL,
    "company_name" VARCHAR(150),
    "legal_name" VARCHAR(150),
    "email" VARCHAR(255),
    "phone" VARCHAR(40),
    "address" TEXT,
    "billing_address" JSONB,
    "shipping_address" JSONB,
    "tax_number" VARCHAR(80),
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "payment_terms" INTEGER,
    "credit_limit" DECIMAL(15, 2),
    "opening_balance" DECIMAL(15, 2),
    "website" VARCHAR(255),
    "notes" TEXT,
    "metadata" JSONB,
    "primary_contact_id" UUID,
    "created_by" BigInt,
    "updated_by" BigInt,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "sta_finance_contacts_pkey" PRIMARY KEY ("id")
);

-- 2. Create sta_finance_contact_persons table
CREATE TABLE "sta_finance_contact_persons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contact_id" UUID NOT NULL,
    "salutation" VARCHAR(10),
    "first_name" VARCHAR(80),
    "last_name" VARCHAR(80),
    "email" VARCHAR(255),
    "phone" VARCHAR(40),
    "mobile" VARCHAR(40),
    "designation" VARCHAR(80),
    "department" VARCHAR(80),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "sta_finance_contact_persons_pkey" PRIMARY KEY ("id")
);

-- 3. Create indexes
CREATE INDEX "sta_finance_contacts_contact_type_idx" ON "sta_finance_contacts"("contact_type");
CREATE INDEX "sta_finance_contacts_is_active_idx" ON "sta_finance_contacts"("is_active");
CREATE INDEX "sta_finance_contact_persons_contact_id_idx" ON "sta_finance_contact_persons"("contact_id");
CREATE UNIQUE INDEX "unique_finance_contact_name_per_org" ON "sta_finance_contacts"("organization_id", "name");
CREATE UNIQUE INDEX "sta_finance_contacts_primary_contact_id_key" ON "sta_finance_contacts"("primary_contact_id");

-- 4. Migrate vendors into contacts
INSERT INTO "sta_finance_contacts" (
    id, organization_id, contact_type, sub_type, name, email, phone, address,
    tax_number, is_taxable, is_active, opening_balance, metadata,
    created_by, updated_by, created_at, updated_at
)
SELECT
    id, organization_id, 'vendor', 'business', name, email, phone, address,
    tax_number, true, is_active, NULL, metadata,
    created_by, updated_by, created_at, updated_at
FROM "sta_finance_vendors";

-- 5. Migrate customers into contacts (merge if same org+name exists from vendor)
-- Customers that share organization_id+name with a vendor: update to 'both' instead of inserting
INSERT INTO "sta_finance_contacts" (
    id, organization_id, contact_type, sub_type, name, email, phone, address,
    tax_number, is_taxable, is_active, credit_limit, metadata,
    created_by, updated_by, created_at, updated_at
)
SELECT
    c.id, c.organization_id, 'customer', 'business', c.name, c.email, c.phone, c.address,
    c.tax_number, true, c.is_active, NULL, c.metadata,
    c.created_by, c.updated_by, c.created_at, c.updated_at
FROM "sta_finance_customers" c
WHERE NOT EXISTS (
    SELECT 1 FROM "sta_finance_contacts" fc
    WHERE fc.organization_id = c.organization_id AND fc.name = c.name
);

-- For customers that overlap with vendors (same org+name), update the contact_type to 'both'
-- and preserve the customer's UUID in a mapping for FK updates below
CREATE TEMP TABLE customer_id_map AS
SELECT c.id AS old_customer_id, fc.id AS new_contact_id
FROM "sta_finance_customers" c
JOIN "sta_finance_contacts" fc ON fc.organization_id = c.organization_id AND fc.name = c.name
WHERE fc.contact_type = 'vendor';

UPDATE "sta_finance_contacts" SET contact_type = 'both'
WHERE id IN (SELECT new_contact_id FROM customer_id_map);

-- 6. Add contact_id column to all referencing tables
ALTER TABLE "sta_finance_sales_invoices" ADD COLUMN "contact_id" UUID;
ALTER TABLE "sta_finance_receipts" ADD COLUMN "contact_id" UUID;
ALTER TABLE "sta_finance_bill_headers" ADD COLUMN "contact_id" UUID;
ALTER TABLE "sta_finance_vendor_payments" ADD COLUMN "contact_id" UUID;
ALTER TABLE "sta_finance_expenses" ADD COLUMN "contact_id" UUID;
ALTER TABLE "sta_finance_payment_vouchers" ADD COLUMN "contact_id" UUID;
ALTER TABLE "sta_request_instances" ADD COLUMN "contact_id" UUID;
ALTER TABLE "sta_finance_vendor_wht_accruals" ADD COLUMN "contact_id" UUID;

-- 7. Populate contact_id from vendor_id (direct UUID match since vendors were copied with same IDs)
UPDATE "sta_finance_bill_headers" SET contact_id = vendor_id WHERE vendor_id IS NOT NULL;
UPDATE "sta_finance_vendor_payments" SET contact_id = vendor_id WHERE vendor_id IS NOT NULL;
UPDATE "sta_finance_expenses" SET contact_id = vendor_id WHERE vendor_id IS NOT NULL;
UPDATE "sta_finance_payment_vouchers" SET contact_id = vendor_id WHERE vendor_id IS NOT NULL;
UPDATE "sta_request_instances" SET contact_id = vendor_id WHERE vendor_id IS NOT NULL;
UPDATE "sta_finance_vendor_wht_accruals" SET contact_id = vendor_id WHERE vendor_id IS NOT NULL;

-- 8. Populate contact_id from customer_id
-- Direct match for customers that were inserted as new rows (no overlap)
UPDATE "sta_finance_sales_invoices" si SET contact_id = si.customer_id
WHERE si.customer_id IS NOT NULL
AND EXISTS (SELECT 1 FROM "sta_finance_contacts" fc WHERE fc.id = si.customer_id);

UPDATE "sta_finance_receipts" r SET contact_id = r.customer_id
WHERE r.customer_id IS NOT NULL
AND EXISTS (SELECT 1 FROM "sta_finance_contacts" fc WHERE fc.id = r.customer_id);

-- For customers that were merged (overlap), use the mapping table
UPDATE "sta_finance_sales_invoices" si SET contact_id = m.new_contact_id
FROM customer_id_map m
WHERE si.customer_id = m.old_customer_id;

UPDATE "sta_finance_receipts" r SET contact_id = m.new_contact_id
FROM customer_id_map m
WHERE r.customer_id = m.old_customer_id;

-- 9. Drop old FK constraints, set NOT NULL where needed, drop old columns, add new FKs

-- FinanceSalesInvoice
ALTER TABLE "sta_finance_sales_invoices" DROP CONSTRAINT IF EXISTS "sta_finance_sales_invoices_customer_id_fkey";
ALTER TABLE "sta_finance_sales_invoices" ALTER COLUMN "contact_id" SET NOT NULL;
ALTER TABLE "sta_finance_sales_invoices" DROP COLUMN "customer_id";
ALTER TABLE "sta_finance_sales_invoices" ADD CONSTRAINT "sta_finance_sales_invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FinanceReceipt
ALTER TABLE "sta_finance_receipts" DROP CONSTRAINT IF EXISTS "sta_finance_receipts_customer_id_fkey";
ALTER TABLE "sta_finance_receipts" DROP COLUMN "customer_id";
ALTER TABLE "sta_finance_receipts" ADD CONSTRAINT "sta_finance_receipts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FinanceBillHeader
ALTER TABLE "sta_finance_bill_headers" DROP CONSTRAINT IF EXISTS "sta_finance_bill_headers_vendor_id_fkey";
ALTER TABLE "sta_finance_bill_headers" ALTER COLUMN "contact_id" SET NOT NULL;
ALTER TABLE "sta_finance_bill_headers" DROP COLUMN "vendor_id";
ALTER TABLE "sta_finance_bill_headers" ADD CONSTRAINT "sta_finance_bill_headers_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FinanceVendorPayment
ALTER TABLE "sta_finance_vendor_payments" DROP CONSTRAINT IF EXISTS "sta_finance_vendor_payments_vendor_id_fkey";
ALTER TABLE "sta_finance_vendor_payments" DROP COLUMN "vendor_id";
ALTER TABLE "sta_finance_vendor_payments" ADD CONSTRAINT "sta_finance_vendor_payments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FinanceExpense
ALTER TABLE "sta_finance_expenses" DROP CONSTRAINT IF EXISTS "sta_finance_expenses_vendor_id_fkey";
ALTER TABLE "sta_finance_expenses" DROP COLUMN "vendor_id";
ALTER TABLE "sta_finance_expenses" ADD CONSTRAINT "sta_finance_expenses_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FinancePaymentVoucher
ALTER TABLE "sta_finance_payment_vouchers" DROP CONSTRAINT IF EXISTS "sta_finance_payment_vouchers_vendor_id_fkey";
ALTER TABLE "sta_finance_payment_vouchers" DROP COLUMN "vendor_id";
ALTER TABLE "sta_finance_payment_vouchers" ADD CONSTRAINT "sta_finance_payment_vouchers_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RequestInstance
ALTER TABLE "sta_request_instances" DROP CONSTRAINT IF EXISTS "sta_request_instances_vendor_id_fkey";
ALTER TABLE "sta_request_instances" DROP COLUMN "vendor_id";
ALTER TABLE "sta_request_instances" ADD CONSTRAINT "sta_request_instances_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FinanceVendorWHTAccrual
ALTER TABLE "sta_finance_vendor_wht_accruals" DROP CONSTRAINT IF EXISTS "sta_finance_vendor_wht_accruals_vendor_id_fkey";
ALTER TABLE "sta_finance_vendor_wht_accruals" ALTER COLUMN "contact_id" SET NOT NULL;
ALTER TABLE "sta_finance_vendor_wht_accruals" DROP COLUMN "vendor_id";
ALTER TABLE "sta_finance_vendor_wht_accruals" ADD CONSTRAINT "sta_finance_vendor_wht_accruals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 10. Add FK for primary_contact_id
ALTER TABLE "sta_finance_contacts" ADD CONSTRAINT "sta_finance_contacts_primary_contact_id_fkey" FOREIGN KEY ("primary_contact_id") REFERENCES "sta_finance_contact_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 11. Add FK for contact_persons -> contacts
ALTER TABLE "sta_finance_contact_persons" ADD CONSTRAINT "sta_finance_contact_persons_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_finance_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. Add FKs for organization and audit users
ALTER TABLE "sta_finance_contacts" ADD CONSTRAINT "sta_finance_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_finance_contacts" ADD CONSTRAINT "sta_finance_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_finance_contacts" ADD CONSTRAINT "sta_finance_contacts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 13. Create new indexes for contact_id on referencing tables
CREATE INDEX "sta_finance_sales_invoices_contact_id_idx" ON "sta_finance_sales_invoices"("contact_id");
CREATE INDEX "sta_finance_receipts_contact_id_idx" ON "sta_finance_receipts"("contact_id");
CREATE INDEX "sta_finance_bill_headers_contact_id_idx" ON "sta_finance_bill_headers"("contact_id");
CREATE INDEX "sta_finance_vendor_payments_contact_id_idx" ON "sta_finance_vendor_payments"("contact_id");
CREATE INDEX "sta_finance_expenses_contact_id_idx" ON "sta_finance_expenses"("contact_id");
CREATE INDEX "sta_finance_payment_vouchers_contact_id_idx" ON "sta_finance_payment_vouchers"("contact_id");
CREATE INDEX "sta_request_instances_contact_id_idx" ON "sta_request_instances"("contact_id");
CREATE INDEX "sta_finance_vendor_wht_accruals_contact_id_idx" ON "sta_finance_vendor_wht_accruals"("contact_id");

-- 14. Drop old tables (after all FK references removed)
DROP TABLE IF EXISTS "sta_finance_vendors";
DROP TABLE IF EXISTS "sta_finance_customers";

-- 15. Drop old indexes that are no longer needed
DROP INDEX IF EXISTS "unique_finance_customer_name_per_org";
DROP INDEX IF EXISTS "unique_finance_vendor_name_per_org";
