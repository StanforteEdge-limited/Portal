-- CreateTable
CREATE TABLE "sta_email_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "to_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body_text" TEXT,
    "body_html" TEXT,
    "thread_key" VARCHAR(191),
    "provider" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "message_id" VARCHAR(255),
    "error_message" TEXT,
    "notifiable_type" VARCHAR(100),
    "notifiable_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_email_logs_user_id_idx" ON "sta_email_logs"("user_id");

-- CreateIndex
CREATE INDEX "sta_email_logs_status_idx" ON "sta_email_logs"("status");

-- CreateIndex
CREATE INDEX "sta_email_logs_notifiable_type_notifiable_id_idx" ON "sta_email_logs"("notifiable_type", "notifiable_id");

-- AddForeignKey
ALTER TABLE "sta_email_logs" ADD CONSTRAINT "sta_email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
