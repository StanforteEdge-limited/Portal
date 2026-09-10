-- CreateTable
CREATE TABLE "sta_acknowledgements" (
  "id" UUID NOT NULL,
  "user_id" BIGINT NOT NULL,
  "subject_type" VARCHAR(60) NOT NULL,
  "subject_id" VARCHAR(191) NOT NULL,
  "subject_label" VARCHAR(255),
  "version" VARCHAR(60),
  "status" VARCHAR(20) NOT NULL DEFAULT 'acknowledged',
  "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  "source_form_submission_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sta_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_ack_subject_version"
ON "sta_acknowledgements"("user_id", "subject_type", "subject_id", "version");

-- CreateIndex
CREATE INDEX "sta_acknowledgements_subject_type_subject_id_idx"
ON "sta_acknowledgements"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "sta_acknowledgements_status_idx"
ON "sta_acknowledgements"("status");

-- AddForeignKey
ALTER TABLE "sta_acknowledgements"
ADD CONSTRAINT "sta_acknowledgements_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_acknowledgements"
ADD CONSTRAINT "sta_acknowledgements_source_form_submission_id_fkey"
FOREIGN KEY ("source_form_submission_id") REFERENCES "sta_form_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
