ALTER TABLE "sta_finance_reporting_periods" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_journal_entries" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_journal_sequences" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_journal_lines" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_finance_ledger_entries" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_finance_journal_lines" jl
SET "tenant_id" = COALESCE(jl."tenant_id", f."tenant_id", o."tenant_id")
FROM "sta_finance_chart_accounts" ca
LEFT JOIN "sta_finance_accounts" f ON f."id" = ca."finance_account_id"
LEFT JOIN "sta_organizations" o ON o."id" = ca."organization_id"
WHERE jl."chart_account_id" = ca."id" AND jl."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_finance_journal_entries" je
SET "tenant_id" = jl."tenant_id"
FROM "sta_finance_journal_lines" jl
WHERE jl."journal_entry_id" = je."id" AND je."tenant_id" IS NULL AND jl."tenant_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "sta_finance_reporting_periods" rp
SET "tenant_id" = je."tenant_id"
FROM "sta_finance_journal_entries" je
WHERE je."period_id" = rp."id" AND rp."tenant_id" IS NULL AND je."tenant_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "sta_finance_ledger_entries" le
SET "tenant_id" = a."tenant_id"
FROM "sta_finance_accounts" a
WHERE le."account_id" = a."id" AND le."tenant_id" IS NULL;
--> statement-breakpoint

DROP INDEX IF EXISTS "unique_finance_reporting_period";
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_reporting_period" ON "sta_finance_reporting_periods" ("tenant_id", "year", "month");
--> statement-breakpoint
DROP INDEX IF EXISTS "sta_finance_journal_entries_entry_no_key";
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_journal_entry_no_per_tenant" ON "sta_finance_journal_entries" ("tenant_id", "entry_no");
--> statement-breakpoint
DROP INDEX IF EXISTS "unique_finance_journal_sequence_prefix_year";
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_journal_sequence_prefix_year" ON "sta_finance_journal_sequences" ("tenant_id", "prefix", "sequence_year");
--> statement-breakpoint

CREATE INDEX "financeReportingPeriod_index_tenantId" ON "sta_finance_reporting_periods" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeJournalEntry_index_tenantId" ON "sta_finance_journal_entries" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeJournalSequence_index_tenantId" ON "sta_finance_journal_sequences" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_tenantId" ON "sta_finance_journal_lines" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "financeLedgerEntry_index_tenantId" ON "sta_finance_ledger_entries" ("tenant_id");
--> statement-breakpoint

ALTER TABLE "sta_finance_reporting_periods"
  ADD CONSTRAINT "finance_reporting_period_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_journal_entries"
  ADD CONSTRAINT "finance_journal_entry_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_journal_sequences"
  ADD CONSTRAINT "finance_journal_sequence_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_journal_lines"
  ADD CONSTRAINT "finance_journal_line_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_ledger_entries"
  ADD CONSTRAINT "finance_ledger_entry_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
