-- Add request status for editable return loop before finance clearance.
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'returned_for_edit';
