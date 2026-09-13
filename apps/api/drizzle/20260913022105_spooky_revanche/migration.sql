CREATE TABLE "sta_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"user_id" bigint,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(36) NOT NULL,
	"action" varchar(50) NOT NULL,
	"comment" text,
	"data" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auditEvent_index_tenantId" ON "sta_audit_events" ("tenant_id");--> statement-breakpoint
CREATE INDEX "auditEvent_index_userId" ON "sta_audit_events" ("user_id");--> statement-breakpoint
CREATE INDEX "auditEvent_index_entity" ON "sta_audit_events" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "auditEvent_index_createdAt" ON "sta_audit_events" ("created_at");--> statement-breakpoint
ALTER TABLE "sta_audit_events" ADD CONSTRAINT "sta_audit_events_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_audit_events" ADD CONSTRAINT "sta_audit_events_user_id_sta_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;