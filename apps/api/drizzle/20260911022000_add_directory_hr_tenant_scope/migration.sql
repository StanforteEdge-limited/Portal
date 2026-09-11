ALTER TABLE "sta_organizations" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_groups" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_employee_profiles" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_attendance_holidays" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_organizations" o
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE o."id" = to2."organization_id"
  AND o."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_groups" g
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE g."organization_id" = to2."organization_id"
  AND g."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_employee_profiles" ep
SET "tenant_id" = to2."tenant_id"
FROM "sta_profiles" p
JOIN "sta_tenant_organizations" to2 ON to2."organization_id" = p."primary_organization_id"
WHERE ep."user_id" = p."id"
  AND ep."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_attendance_holidays" ah
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE ah."organization_id" = to2."organization_id"
  AND ah."tenant_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "organization_index_tenantId" ON "sta_organizations" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "group_index_tenantId" ON "sta_groups" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "employeeProfile_index_tenantId" ON "sta_employee_profiles" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "attendanceHoliday_index_tenantId" ON "sta_attendance_holidays" ("tenant_id");
