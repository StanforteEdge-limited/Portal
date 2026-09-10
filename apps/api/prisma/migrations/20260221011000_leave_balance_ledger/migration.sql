CREATE TABLE "sta_leave_balance_ledger" (
  "id" UUID NOT NULL,
  "user_id" BIGINT NOT NULL,
  "leave_type_key" VARCHAR(100) NOT NULL,
  "period_year" INTEGER NOT NULL,
  "delta_days" DECIMAL(7,2) NOT NULL,
  "entry_type" VARCHAR(30) NOT NULL,
  "source_request_id" BIGINT,
  "notes" TEXT,
  "metadata" JSONB,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_leave_balance_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_leave_balance_ledger_user_id_leave_type_key_period_year_idx"
  ON "sta_leave_balance_ledger"("user_id", "leave_type_key", "period_year");
CREATE INDEX "sta_leave_balance_ledger_entry_type_idx"
  ON "sta_leave_balance_ledger"("entry_type");
CREATE INDEX "sta_leave_balance_ledger_source_request_id_idx"
  ON "sta_leave_balance_ledger"("source_request_id");

ALTER TABLE "sta_leave_balance_ledger"
  ADD CONSTRAINT "sta_leave_balance_ledger_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_leave_balance_ledger"
  ADD CONSTRAINT "sta_leave_balance_ledger_source_request_id_fkey"
  FOREIGN KEY ("source_request_id") REFERENCES "sta_request_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
