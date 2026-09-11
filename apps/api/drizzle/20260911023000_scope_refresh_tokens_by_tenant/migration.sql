ALTER TABLE "sta_tokens" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_tokens" t
SET "tenant_id" = to2."tenant_id"
FROM "sta_profiles" p
JOIN "sta_tenant_organizations" to2 ON to2."organization_id" = p."primary_organization_id"
WHERE t."profile_id" = p."id"
  AND t."tenant_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "token_index_tenantId" ON "sta_tokens" ("tenant_id");
