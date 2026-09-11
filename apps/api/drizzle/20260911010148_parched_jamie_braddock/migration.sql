CREATE TABLE "sta_tenants" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"plan" varchar(50) DEFAULT 'trial' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_tenant_memberships" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"profile_id" bigint NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp(6) DEFAULT now() NOT NULL,
	"removed_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_tenant_organizations" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"organization_id" bigint NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_unique_slug" ON "sta_tenants" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_membership_unique_profile" ON "sta_tenant_memberships" ("tenant_id","profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_organization_unique" ON "sta_tenant_organizations" ("tenant_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_organization_org_unique" ON "sta_tenant_organizations" ("organization_id");--> statement-breakpoint

-- The existing installation becomes the first SaaS tenant. Organizations remain
-- business units inside it and can be split into separate tenants later.
INSERT INTO "sta_tenants" ("name", "slug", "status", "plan", "updated_at")
VALUES ('Default Tenant', 'default', 'active', 'trial', now())
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint

INSERT INTO "sta_tenant_organizations" ("tenant_id", "organization_id")
SELECT t."id", o."id"
FROM "sta_tenants" t
CROSS JOIN "sta_organizations" o
WHERE t."slug" = 'default'
ON CONFLICT ("organization_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "sta_tenant_memberships" ("tenant_id", "profile_id", "is_owner")
SELECT DISTINCT t."id", po."profile_id", false
FROM "sta_tenants" t
JOIN "sta_tenant_organizations" to2 ON to2."tenant_id" = t."id"
JOIN "sta_profile_organizations" po ON po."organization_id" = to2."organization_id"
WHERE t."slug" = 'default'
ON CONFLICT ("tenant_id", "profile_id") DO NOTHING;