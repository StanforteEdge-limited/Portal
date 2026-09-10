ALTER TABLE "sta_attendance_entries"
  ADD COLUMN "attendance_mode" VARCHAR(30),
  ADD COLUMN "office_location_id" BIGINT,
  ADD COLUMN "latitude" DECIMAL(10,7),
  ADD COLUMN "longitude" DECIMAL(10,7),
  ADD COLUMN "geofence_status" VARCHAR(30);

ALTER TABLE "sta_attendance_daily"
  ADD COLUMN "attendance_mode" VARCHAR(30),
  ADD COLUMN "expected_mode" VARCHAR(30),
  ADD COLUMN "reconciliation_status" VARCHAR(30),
  ADD COLUMN "office_location_id" BIGINT,
  ADD COLUMN "geofence_status" VARCHAR(30);

CREATE TABLE "sta_office_locations" (
  "id" BIGSERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "address" VARCHAR(255),
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "radius_meters" INTEGER NOT NULL DEFAULT 150,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata" JSONB,
  "created_by" BIGINT,
  "updated_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "sta_organization_office_locations" (
  "id" BIGSERIAL PRIMARY KEY,
  "organization_id" BIGINT NOT NULL,
  "office_location_id" BIGINT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_organization_office_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sta_organization_office_locations_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "sta_office_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "unique_org_office_location" ON "sta_organization_office_locations"("organization_id", "office_location_id");
CREATE INDEX "sta_organization_office_locations_office_location_id_idx" ON "sta_organization_office_locations"("office_location_id");

CREATE TABLE "sta_attendance_holidays" (
  "id" UUID PRIMARY KEY,
  "organization_id" BIGINT,
  "office_location_id" BIGINT,
  "holiday_date" DATE NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "is_recurring" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_attendance_holidays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_holidays_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "sta_office_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "sta_attendance_holidays_organization_id_holiday_date_idx" ON "sta_attendance_holidays"("organization_id", "holiday_date");
CREATE INDEX "sta_attendance_holidays_office_location_id_holiday_date_idx" ON "sta_attendance_holidays"("office_location_id", "holiday_date");

CREATE TABLE "sta_attendance_corrections" (
  "id" UUID PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "attendance_daily_id" UUID,
  "attendance_entry_id" UUID,
  "office_location_id" BIGINT,
  "request_type" VARCHAR(40) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requested_by" BIGINT NOT NULL,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by" BIGINT,
  "reason" TEXT NOT NULL,
  "work_date" DATE NOT NULL,
  "proposed_at" TIMESTAMP(3),
  "proposed_mode" VARCHAR(30),
  "proposed_office_location_id" BIGINT,
  "proposed_latitude" DECIMAL(10,7),
  "proposed_longitude" DECIMAL(10,7),
  "review_notes" TEXT,
  "snapshot_json" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_attendance_corrections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_corrections_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_corrections_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_corrections_attendance_daily_id_fkey" FOREIGN KEY ("attendance_daily_id") REFERENCES "sta_attendance_daily"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_corrections_attendance_entry_id_fkey" FOREIGN KEY ("attendance_entry_id") REFERENCES "sta_attendance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_corrections_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "sta_office_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_corrections_proposed_office_location_id_fkey" FOREIGN KEY ("proposed_office_location_id") REFERENCES "sta_office_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "sta_attendance_corrections_user_id_work_date_idx" ON "sta_attendance_corrections"("user_id", "work_date");
CREATE INDEX "sta_attendance_corrections_status_requested_at_idx" ON "sta_attendance_corrections"("status", "requested_at");

CREATE TABLE "sta_attendance_exceptions" (
  "id" UUID PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "attendance_daily_id" UUID,
  "attendance_entry_id" UUID,
  "office_location_id" BIGINT,
  "exception_type" VARCHAR(40) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "work_date" DATE NOT NULL,
  "attendance_mode" VARCHAR(30),
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "created_by" BIGINT NOT NULL,
  "reviewed_by" BIGINT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_attendance_exceptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_exceptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_exceptions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_exceptions_attendance_daily_id_fkey" FOREIGN KEY ("attendance_daily_id") REFERENCES "sta_attendance_daily"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_exceptions_attendance_entry_id_fkey" FOREIGN KEY ("attendance_entry_id") REFERENCES "sta_attendance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sta_attendance_exceptions_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "sta_office_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "sta_attendance_exceptions_user_id_work_date_idx" ON "sta_attendance_exceptions"("user_id", "work_date");
CREATE INDEX "sta_attendance_exceptions_status_exception_type_idx" ON "sta_attendance_exceptions"("status", "exception_type");

ALTER TABLE "sta_attendance_entries"
  ADD CONSTRAINT "sta_attendance_entries_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "sta_office_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_attendance_daily"
  ADD CONSTRAINT "sta_attendance_daily_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "sta_office_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
