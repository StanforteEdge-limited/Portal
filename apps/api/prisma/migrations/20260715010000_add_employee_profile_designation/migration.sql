ALTER TABLE "sta_employee_profiles"
ADD COLUMN IF NOT EXISTS "designation_id" BIGINT;

CREATE INDEX IF NOT EXISTS "sta_employee_profiles_designation_id_idx"
ON "sta_employee_profiles"("designation_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sta_employee_profiles_designation_id_fkey'
  ) THEN
    ALTER TABLE "sta_employee_profiles"
    ADD CONSTRAINT "sta_employee_profiles_designation_id_fkey"
    FOREIGN KEY ("designation_id") REFERENCES "sta_hr_designations"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
