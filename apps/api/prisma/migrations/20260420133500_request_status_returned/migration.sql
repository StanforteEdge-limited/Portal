-- Rename RequestStatus value from returned_for_edit to returned.
-- This migration is idempotent and safe across environments with/without returned_for_edit.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'RequestStatus' AND e.enumlabel = 'returned_for_edit'
  ) THEN
    ALTER TYPE "RequestStatus" RENAME VALUE 'returned_for_edit' TO 'returned';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'RequestStatus' AND e.enumlabel = 'returned'
  ) THEN
    ALTER TYPE "RequestStatus" ADD VALUE 'returned';
  END IF;
END $$;
