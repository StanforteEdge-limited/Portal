-- Ensure login lockout counter column exists in environments with schema drift.
ALTER TABLE "sta_profiles"
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
