-- DropForeignKey
ALTER TABLE "sta_employee_profiles" DROP CONSTRAINT "sta_employee_profiles_primary_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "sta_employee_profiles" DROP CONSTRAINT "sta_employee_profiles_primary_team_id_fkey";

-- DropIndex
DROP INDEX "sta_employee_profiles_primary_organization_id_idx";

-- DropIndex
DROP INDEX "sta_employee_profiles_primary_team_id_idx";

-- AlterTable
ALTER TABLE "sta_employee_profiles" DROP COLUMN "primary_organization_id",
DROP COLUMN "primary_team_id";

-- AlterTable
ALTER TABLE "sta_group_users" ADD COLUMN     "is_primary" BOOLEAN NOT NULL DEFAULT false;
