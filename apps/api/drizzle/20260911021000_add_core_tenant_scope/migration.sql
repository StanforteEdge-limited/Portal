ALTER TABLE "sta_projects" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_request_groups" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_request_instances" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_file_assets" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_documents" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_projects" p
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE p."organization_id" = to2."organization_id"
  AND p."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_request_groups" rg
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE rg."organization_id" = to2."organization_id"
  AND rg."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_request_instances" ri
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE ri."organization_id" = to2."organization_id"
  AND ri."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_file_assets" fa
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE fa."organization_id" = to2."organization_id"
  AND fa."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_documents" d
SET "tenant_id" = to2."tenant_id"
FROM "sta_tenant_organizations" to2
WHERE d."organization_id" = to2."organization_id"
  AND d."tenant_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "project_index_tenantId" ON "sta_projects" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "requestGroup_index_tenantId" ON "sta_request_groups" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "requestInstance_index_tenantId" ON "sta_request_instances" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "fileAsset_index_tenantId" ON "sta_file_assets" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "document_index_tenantId" ON "sta_documents" ("tenant_id");
