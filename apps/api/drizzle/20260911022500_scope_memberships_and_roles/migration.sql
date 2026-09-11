ALTER TABLE "sta_profile_organizations" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_user_roles" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_profile_organizations" po
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE po."organization_id" = to2."organization_id"
  AND po."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_user_roles" ur
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE ur."organization_id" = to2."organization_id"
  AND ur."tenant_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "profileOrganization_index_tenantId" ON "sta_profile_organizations" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "userRole_index_tenantId" ON "sta_user_roles" ("tenant_id");
