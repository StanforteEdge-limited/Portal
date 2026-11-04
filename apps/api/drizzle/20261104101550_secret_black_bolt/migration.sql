CREATE TABLE IF NOT EXISTS "sta_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"parent_department_id" uuid,
	"organization_id" bigint,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sta_department_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"department_id" uuid NOT NULL,
	"profile_id" bigint NOT NULL,
	"is_manager" boolean DEFAULT false NOT NULL,
	"effective_from" date DEFAULT now() NOT NULL,
	"effective_to" date,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "department_tenant_code_unique" ON "sta_departments" ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_index_tenantId" ON "sta_departments" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_index_parentDepartmentId" ON "sta_departments" ("parent_department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_index_organizationId" ON "sta_departments" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "department_member_unique" ON "sta_department_members" ("department_id","profile_id","effective_from");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_member_index_departmentId" ON "sta_department_members" ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_member_index_profileId" ON "sta_department_members" ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_member_index_tenantId" ON "sta_department_members" ("tenant_id");--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sta_departments_tenant_id_sta_tenants_id_fkey') THEN
		ALTER TABLE "sta_departments" ADD CONSTRAINT "sta_departments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sta_departments_created_by_sta_profiles_id_fkey') THEN
		ALTER TABLE "sta_departments" ADD CONSTRAINT "sta_departments_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sta_departments_updated_by_sta_profiles_id_fkey') THEN
		ALTER TABLE "sta_departments" ADD CONSTRAINT "sta_departments_updated_by_sta_profiles_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sta_department_members_tenant_id_sta_tenants_id_fkey') THEN
		ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sta_department_members_department_id_sta_departments_id_fkey') THEN
		ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_department_id_sta_departments_id_fkey" FOREIGN KEY ("department_id") REFERENCES "sta_departments"("id") ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sta_department_members_profile_id_sta_profiles_id_fkey') THEN
		ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_profile_id_sta_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sta_department_members_created_by_sta_profiles_id_fkey') THEN
		ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;
	END IF;
END $$;
