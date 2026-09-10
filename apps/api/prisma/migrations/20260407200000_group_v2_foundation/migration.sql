CREATE TABLE "sta_group_organizations" (
  "id" BIGSERIAL PRIMARY KEY,
  "group_id" BIGINT NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_group_organizations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "sta_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sta_group_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "unique_group_organization" ON "sta_group_organizations"("group_id", "organization_id");
CREATE INDEX "sta_group_organizations_organization_id_idx" ON "sta_group_organizations"("organization_id");
CREATE UNIQUE INDEX "sta_group_organizations_primary_per_group" ON "sta_group_organizations"("group_id") WHERE "is_primary" = TRUE;

CREATE TABLE "sta_group_user_organization_scopes" (
  "id" BIGSERIAL PRIMARY KEY,
  "group_user_id" BIGINT NOT NULL,
  "organization_id" BIGINT NOT NULL,
  "scope_role" VARCHAR(50),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_group_user_organization_scopes_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "sta_group_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sta_group_user_organization_scopes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "unique_group_user_organization_scope" ON "sta_group_user_organization_scopes"("group_user_id", "organization_id");
CREATE INDEX "sta_group_user_organization_scopes_organization_id_idx" ON "sta_group_user_organization_scopes"("organization_id");

INSERT INTO "sta_group_organizations" ("group_id", "organization_id", "is_primary")
SELECT g."id", g."organization_id", TRUE
FROM "sta_groups" g
WHERE g."organization_id" IS NOT NULL
ON CONFLICT ("group_id", "organization_id") DO NOTHING;
