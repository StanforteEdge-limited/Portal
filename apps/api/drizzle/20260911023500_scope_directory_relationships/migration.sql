ALTER TABLE "sta_organization_office_locations" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_group_organizations" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_group_user_organization_scopes" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_organization_office_locations" ool
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE ool."organization_id" = to2."organization_id"
  AND ool."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_group_organizations" go
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE go."organization_id" = to2."organization_id"
  AND go."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_group_user_organization_scopes" guos
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE guos."organization_id" = to2."organization_id"
  AND guos."tenant_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "organizationOfficeLocation_index_tenantId"
  ON "sta_organization_office_locations" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "groupOrganization_index_tenantId"
  ON "sta_group_organizations" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "groupUserOrganizationScope_index_tenantId"
  ON "sta_group_user_organization_scopes" ("tenant_id");
