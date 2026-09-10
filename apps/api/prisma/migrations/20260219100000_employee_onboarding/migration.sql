-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'contract', 'intern', 'consultant');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('draft', 'active', 'suspended', 'exited');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('onsite', 'hybrid', 'remote');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('invited', 'accepted', 'profile_pending', 'forms_pending', 'hr_review', 'completed');

-- CreateTable
CREATE TABLE "sta_employee_profiles" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "employee_code" VARCHAR(60),
    "job_title" VARCHAR(120),
    "job_description" TEXT,
    "manager_user_id" BIGINT,
    "employment_type" "EmploymentType",
    "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'draft',
    "hire_date" DATE,
    "confirmation_date" DATE,
    "exit_date" DATE,
    "work_mode" "WorkMode",
    "primary_team_id" BIGINT,
    "primary_organization_id" BIGINT,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_employee_meta" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "meta_key" VARCHAR(120) NOT NULL,
    "meta_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_employee_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_onboarding_progress" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'invited',
    "current_step" VARCHAR(80),
    "steps_json" JSONB,
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_employee_profiles_user_id_key" ON "sta_employee_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_employee_profiles_employee_code_key" ON "sta_employee_profiles"("employee_code");

-- CreateIndex
CREATE INDEX "sta_employee_profiles_manager_user_id_idx" ON "sta_employee_profiles"("manager_user_id");

-- CreateIndex
CREATE INDEX "sta_employee_profiles_primary_team_id_idx" ON "sta_employee_profiles"("primary_team_id");

-- CreateIndex
CREATE INDEX "sta_employee_profiles_primary_organization_id_idx" ON "sta_employee_profiles"("primary_organization_id");

-- CreateIndex
CREATE INDEX "sta_employee_profiles_employment_status_idx" ON "sta_employee_profiles"("employment_status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_meta_unique" ON "sta_employee_meta"("user_id", "meta_key");

-- CreateIndex
CREATE INDEX "sta_employee_meta_meta_key_idx" ON "sta_employee_meta"("meta_key");

-- CreateIndex
CREATE UNIQUE INDEX "sta_onboarding_progress_user_id_key" ON "sta_onboarding_progress"("user_id");

-- CreateIndex
CREATE INDEX "sta_onboarding_progress_status_idx" ON "sta_onboarding_progress"("status");

-- AddForeignKey
ALTER TABLE "sta_employee_profiles" ADD CONSTRAINT "sta_employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_employee_profiles" ADD CONSTRAINT "sta_employee_profiles_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_employee_profiles" ADD CONSTRAINT "sta_employee_profiles_primary_team_id_fkey" FOREIGN KEY ("primary_team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_employee_profiles" ADD CONSTRAINT "sta_employee_profiles_primary_organization_id_fkey" FOREIGN KEY ("primary_organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_employee_meta" ADD CONSTRAINT "sta_employee_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_onboarding_progress" ADD CONSTRAINT "sta_onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
