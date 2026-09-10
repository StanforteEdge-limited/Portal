CREATE TABLE "sta_payroll_notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_payroll_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sta_payroll_notification_preferences_user_id_key" ON "sta_payroll_notification_preferences"("user_id");
CREATE INDEX "sta_payroll_notification_preferences_user_id_idx" ON "sta_payroll_notification_preferences"("user_id");

ALTER TABLE "sta_payroll_notification_preferences"
ADD CONSTRAINT "sta_payroll_notification_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
