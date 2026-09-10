CREATE TABLE "sta_attendance_entries" (
  "id" UUID NOT NULL,
  "user_id" BIGINT NOT NULL,
  "entry_type" VARCHAR(30) NOT NULL,
  "entry_at" TIMESTAMP(3) NOT NULL,
  "work_date" DATE NOT NULL,
  "source" VARCHAR(30) NOT NULL DEFAULT 'web',
  "metadata" JSONB,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_attendance_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sta_attendance_daily" (
  "id" UUID NOT NULL,
  "user_id" BIGINT NOT NULL,
  "work_date" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'absent',
  "scheduled_minutes" INTEGER NOT NULL DEFAULT 0,
  "worked_minutes" INTEGER NOT NULL DEFAULT 0,
  "late_minutes" INTEGER NOT NULL DEFAULT 0,
  "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
  "first_in_at" TIMESTAMP(3),
  "last_out_at" TIMESTAMP(3),
  "policy_snapshot" JSONB,
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_attendance_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unique_attendance_daily" ON "sta_attendance_daily"("user_id", "work_date");
CREATE INDEX "sta_attendance_entries_user_id_work_date_idx" ON "sta_attendance_entries"("user_id", "work_date");
CREATE INDEX "sta_attendance_entries_entry_type_entry_at_idx" ON "sta_attendance_entries"("entry_type", "entry_at");
CREATE INDEX "sta_attendance_daily_status_idx" ON "sta_attendance_daily"("status");

ALTER TABLE "sta_attendance_entries"
  ADD CONSTRAINT "sta_attendance_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_attendance_daily"
  ADD CONSTRAINT "sta_attendance_daily_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
