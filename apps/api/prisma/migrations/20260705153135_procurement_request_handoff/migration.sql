-- CreateTable
CREATE TABLE "sta_procurement_cases" (
    "id" UUID NOT NULL,
    "request_id" BIGINT NOT NULL,
    "requisition_id" UUID,
    "assigned_officer_id" BIGINT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'new',
    "category" VARCHAR(20),
    "note" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_procurement_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_procurement_cases_request_id_key" ON "sta_procurement_cases"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_procurement_cases_requisition_id_key" ON "sta_procurement_cases"("requisition_id");

-- CreateIndex
CREATE INDEX "sta_procurement_cases_status_idx" ON "sta_procurement_cases"("status");

-- CreateIndex
CREATE INDEX "sta_procurement_cases_assigned_officer_id_idx" ON "sta_procurement_cases"("assigned_officer_id");

-- AddForeignKey
ALTER TABLE "sta_procurement_cases" ADD CONSTRAINT "sta_procurement_cases_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sta_request_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_procurement_cases" ADD CONSTRAINT "sta_procurement_cases_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "sta_procurement_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
