CREATE TABLE "sta_contacts" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"organization_id" bigint,
	"created_by" bigint,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(30),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_email_tenant_unique" ON "sta_contacts" ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "contact_index_tenantId" ON "sta_contacts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "contact_index_organizationId" ON "sta_contacts" ("organization_id");--> statement-breakpoint
ALTER TABLE "sta_contacts" ADD CONSTRAINT "sta_contacts_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_contacts" ADD CONSTRAINT "sta_contacts_organization_id_sta_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_contacts" ADD CONSTRAINT "sta_contacts_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;