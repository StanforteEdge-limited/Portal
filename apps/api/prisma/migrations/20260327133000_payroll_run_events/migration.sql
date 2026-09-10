CREATE TABLE "sta_payroll_run_events" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "actor_id" BIGINT,
    "event_type" VARCHAR(40) NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_run_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sta_payroll_payslip_distributions" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "run_item_id" UUID,
    "worker_id" UUID,
    "recipient_email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "sent_by" BIGINT,
    "sent_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_payslip_distributions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_payroll_run_events_run_id_created_at_idx" ON "sta_payroll_run_events"("run_id", "created_at");
CREATE INDEX "sta_payroll_run_events_event_type_idx" ON "sta_payroll_run_events"("event_type");
CREATE INDEX "sta_payroll_run_events_actor_id_idx" ON "sta_payroll_run_events"("actor_id");

CREATE INDEX "sta_payroll_payslip_distributions_run_id_created_at_idx" ON "sta_payroll_payslip_distributions"("run_id", "created_at");
CREATE INDEX "sta_payroll_payslip_distributions_run_item_id_idx" ON "sta_payroll_payslip_distributions"("run_item_id");
CREATE INDEX "sta_payroll_payslip_distributions_worker_id_idx" ON "sta_payroll_payslip_distributions"("worker_id");
CREATE INDEX "sta_payroll_payslip_distributions_status_idx" ON "sta_payroll_payslip_distributions"("status");
CREATE INDEX "sta_payroll_payslip_distributions_sent_by_idx" ON "sta_payroll_payslip_distributions"("sent_by");

ALTER TABLE "sta_payroll_run_events"
ADD CONSTRAINT "sta_payroll_run_events_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "sta_payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_run_events"
ADD CONSTRAINT "sta_payroll_run_events_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_payslip_distributions"
ADD CONSTRAINT "sta_payroll_payslip_distributions_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "sta_payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_payslip_distributions"
ADD CONSTRAINT "sta_payroll_payslip_distributions_run_item_id_fkey"
FOREIGN KEY ("run_item_id") REFERENCES "sta_payroll_run_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_payslip_distributions"
ADD CONSTRAINT "sta_payroll_payslip_distributions_worker_id_fkey"
FOREIGN KEY ("worker_id") REFERENCES "sta_payroll_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_payslip_distributions"
ADD CONSTRAINT "sta_payroll_payslip_distributions_sent_by_fkey"
FOREIGN KEY ("sent_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
