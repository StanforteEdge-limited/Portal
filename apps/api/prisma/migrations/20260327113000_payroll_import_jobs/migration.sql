CREATE TABLE "sta_payroll_import_jobs" (
    "id" UUID NOT NULL,
    "retry_of_job_id" UUID,
    "uploaded_by" BIGINT,
    "retried_by" BIGINT,
    "file_name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'processing',
    "update_existing" BOOLEAN NOT NULL DEFAULT false,
    "summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sta_payroll_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sta_payroll_import_rows" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "sheet_name" VARCHAR(30) NOT NULL,
    "row_number" INTEGER,
    "row_key" VARCHAR(255),
    "action" VARCHAR(20) NOT NULL DEFAULT 'create',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "payload" JSONB NOT NULL,
    "linked_run_id" UUID,
    "linked_run_item_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sta_payroll_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_payroll_import_jobs_status_created_at_idx" ON "sta_payroll_import_jobs"("status", "created_at");
CREATE INDEX "sta_payroll_import_jobs_uploaded_by_idx" ON "sta_payroll_import_jobs"("uploaded_by");
CREATE INDEX "sta_payroll_import_jobs_retry_of_job_id_idx" ON "sta_payroll_import_jobs"("retry_of_job_id");
CREATE INDEX "sta_payroll_import_rows_job_id_sheet_name_idx" ON "sta_payroll_import_rows"("job_id", "sheet_name");
CREATE INDEX "sta_payroll_import_rows_status_idx" ON "sta_payroll_import_rows"("status");
CREATE INDEX "sta_payroll_import_rows_linked_run_id_idx" ON "sta_payroll_import_rows"("linked_run_id");
CREATE INDEX "sta_payroll_import_rows_linked_run_item_id_idx" ON "sta_payroll_import_rows"("linked_run_item_id");

ALTER TABLE "sta_payroll_import_jobs"
ADD CONSTRAINT "sta_payroll_import_jobs_retry_of_job_id_fkey"
FOREIGN KEY ("retry_of_job_id") REFERENCES "sta_payroll_import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_import_jobs"
ADD CONSTRAINT "sta_payroll_import_jobs_uploaded_by_fkey"
FOREIGN KEY ("uploaded_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_import_jobs"
ADD CONSTRAINT "sta_payroll_import_jobs_retried_by_fkey"
FOREIGN KEY ("retried_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_import_rows"
ADD CONSTRAINT "sta_payroll_import_rows_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "sta_payroll_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
