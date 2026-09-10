-- Extend RequestStatus enum for dynamic finance lifecycle states.
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'approval';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'cleared';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'cancelled';
