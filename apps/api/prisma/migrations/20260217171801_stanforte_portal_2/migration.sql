/*
  Warnings:

  - The values [pending_approval] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('draft', 'sent', 'approval', 'cleared', 'approved', 'rejected', 'cancelled', 'payment_processing', 'disbursed', 'confirmed', 'partially_disbursed', 'pending_retirement', 'retired', 'completed');
ALTER TABLE "sta_request_instances" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "sta_request_instances" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "RequestStatus_old";
ALTER TABLE "sta_request_instances" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;
