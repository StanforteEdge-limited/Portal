ALTER TABLE "sta_notifications" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint
ALTER TABLE "sta_email_logs" ADD COLUMN "tenant_id" bigint;
--> statement-breakpoint

UPDATE "sta_notifications" n
SET "tenant_id" = tm."tenant_id"
FROM "sta_tenant_memberships" tm
WHERE n."user_id" = tm."profile_id"
  AND tm."status" = 'active'
  AND n."tenant_id" IS NULL;
--> statement-breakpoint
UPDATE "sta_email_logs" e
SET "tenant_id" = tm."tenant_id"
FROM "sta_tenant_memberships" tm
WHERE e."user_id" = tm."profile_id"
  AND tm."status" = 'active'
  AND e."tenant_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "notification_index_tenantId" ON "sta_notifications" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "emailLog_index_tenantId" ON "sta_email_logs" ("tenant_id");
--> statement-breakpoint

ALTER TABLE "sta_notifications"
  ADD CONSTRAINT "notification_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_email_logs"
  ADD CONSTRAINT "email_log_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
