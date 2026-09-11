CREATE TABLE IF NOT EXISTS "sta_notification_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" bigint NOT NULL,
  "notification_id" bigint NOT NULL,
  "channel" varchar(30) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "run_at" timestamp(6) DEFAULT now() NOT NULL,
  "locked_at" timestamp(6),
  "processed_at" timestamp(6),
  "last_error" varchar(1000),
  "created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_job_status_run_idx" ON "sta_notification_jobs" ("status", "run_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_job_tenant_idx" ON "sta_notification_jobs" ("tenant_id");
--> statement-breakpoint
ALTER TABLE "sta_notification_jobs"
  ADD CONSTRAINT "notification_job_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "sta_notification_jobs"
  ADD CONSTRAINT "notification_job_notification_fk"
  FOREIGN KEY ("notification_id") REFERENCES "sta_notifications" ("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sta_analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" bigint,
  "profile_id" bigint,
  "name" varchar(120) NOT NULL,
  "source" varchar(80) NOT NULL,
  "properties" jsonb,
  "occurred_at" timestamp(6) DEFAULT now() NOT NULL,
  "created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_event_tenant_name_idx" ON "sta_analytics_events" ("tenant_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_event_occurred_idx" ON "sta_analytics_events" ("occurred_at");
--> statement-breakpoint
ALTER TABLE "sta_analytics_events"
  ADD CONSTRAINT "analytics_event_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
