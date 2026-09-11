-- Tenant ownership hardening is intentionally nullable during the rollout.
-- Keep these guards idempotent so partially applied environments can recover safely.
DO $$
BEGIN
  IF to_regclass('"sta_tenant_subscriptions"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'tenant_subscription_tenant_fk'
        AND conrelid = '"sta_tenant_subscriptions"'::regclass
    ) THEN
    ALTER TABLE "sta_tenant_subscriptions"
      ADD CONSTRAINT "tenant_subscription_tenant_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF to_regclass('"sta_tenant_subscriptions"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'tenant_subscription_plan_fk'
        AND conrelid = '"sta_tenant_subscriptions"'::regclass
    ) THEN
    ALTER TABLE "sta_tenant_subscriptions"
      ADD CONSTRAINT "tenant_subscription_plan_fk"
      FOREIGN KEY ("plan_id") REFERENCES "sta_subscription_plans" ("id")
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF to_regclass('"sta_billing_invoices"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'billing_invoice_tenant_fk'
        AND conrelid = '"sta_billing_invoices"'::regclass
    ) THEN
    ALTER TABLE "sta_billing_invoices"
      ADD CONSTRAINT "billing_invoice_tenant_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF to_regclass('"sta_billing_invoices"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'billing_invoice_subscription_fk'
        AND conrelid = '"sta_billing_invoices"'::regclass
    ) THEN
    ALTER TABLE "sta_billing_invoices"
      ADD CONSTRAINT "billing_invoice_subscription_fk"
      FOREIGN KEY ("subscription_id") REFERENCES "sta_tenant_subscriptions" ("id")
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF to_regclass('"sta_billing_invoices"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'billing_invoice_plan_fk'
        AND conrelid = '"sta_billing_invoices"'::regclass
    ) THEN
    ALTER TABLE "sta_billing_invoices"
      ADD CONSTRAINT "billing_invoice_plan_fk"
      FOREIGN KEY ("plan_id") REFERENCES "sta_subscription_plans" ("id")
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF to_regclass('"sta_billing_payment_attempts"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'billing_attempt_tenant_fk'
        AND conrelid = '"sta_billing_payment_attempts"'::regclass
    ) THEN
    ALTER TABLE "sta_billing_payment_attempts"
      ADD CONSTRAINT "billing_attempt_tenant_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF to_regclass('"sta_billing_payment_attempts"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'billing_attempt_invoice_fk'
        AND conrelid = '"sta_billing_payment_attempts"'::regclass
    ) THEN
    ALTER TABLE "sta_billing_payment_attempts"
      ADD CONSTRAINT "billing_attempt_invoice_fk"
      FOREIGN KEY ("invoice_id") REFERENCES "sta_billing_invoices" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "billing_invoice_tenant_status_idx"
  ON "sta_billing_invoices" ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_attempt_invoice_idx"
  ON "sta_billing_payment_attempts" ("invoice_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "financeReportingPeriod_index_tenantId"
  ON "sta_finance_reporting_periods" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financeJournalEntry_index_tenantId"
  ON "sta_finance_journal_entries" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financeJournalSequence_index_tenantId"
  ON "sta_finance_journal_sequences" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financeJournalLine_index_tenantId"
  ON "sta_finance_journal_lines" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financeLedgerEntry_index_tenantId"
  ON "sta_finance_ledger_entries" ("tenant_id");
