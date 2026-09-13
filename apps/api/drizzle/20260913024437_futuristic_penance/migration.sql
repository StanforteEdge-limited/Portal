CREATE TABLE "sta_sprints" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"project_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"goal" text,
	"start_date" date,
	"end_date" date,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD COLUMN "sprint_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD COLUMN "estimate_points" integer;--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "sprint_index_tenantId" ON "sta_sprints" ("tenant_id");--> statement-breakpoint
CREATE INDEX "sprint_index_projectId" ON "sta_sprints" ("project_id");--> statement-breakpoint
CREATE INDEX "sprint_index_status" ON "sta_sprints" ("status");--> statement-breakpoint
CREATE INDEX "workItem_index_sprintId" ON "sta_work_items" ("sprint_id");--> statement-breakpoint
CREATE INDEX "workItem_index_parentId" ON "sta_work_items" ("parent_id");--> statement-breakpoint
ALTER TABLE "sta_sprints" ADD CONSTRAINT "sta_sprints_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_sprints" ADD CONSTRAINT "sta_sprints_project_id_sta_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "sta_projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_sprints" ADD CONSTRAINT "sta_sprints_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_sprint_id_sta_sprints_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sta_sprints"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_parent_id_sta_work_items_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sta_work_items"("id") ON DELETE CASCADE;