ALTER TYPE "token_type" ADD VALUE 'verify_email';--> statement-breakpoint
CREATE TABLE "sta_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"parent_department_id" uuid,
	"organization_id" bigint,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_department_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"department_id" uuid NOT NULL,
	"profile_id" bigint NOT NULL,
	"is_manager" boolean DEFAULT false NOT NULL,
	"effective_from" date DEFAULT now() NOT NULL,
	"effective_to" date,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_work_item_attachments" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"work_item_id" uuid NOT NULL,
	"file_asset_id" uuid NOT NULL,
	"label" varchar(150),
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_work_item_comments" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"work_item_id" uuid NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_work_item_comment_mentions" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"comment_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "sta_contacts";--> statement-breakpoint
ALTER TABLE "sta_roles" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD COLUMN "color" varchar(40);--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "sta_leave_balance_ledger" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sta_onboarding_progress" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
CREATE UNIQUE INDEX "department_tenant_code_unique" ON "sta_departments" ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "department_index_tenantId" ON "sta_departments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "department_index_parentDepartmentId" ON "sta_departments" ("parent_department_id");--> statement-breakpoint
CREATE INDEX "department_index_organizationId" ON "sta_departments" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_member_unique" ON "sta_department_members" ("department_id","profile_id","effective_from");--> statement-breakpoint
CREATE INDEX "department_member_index_departmentId" ON "sta_department_members" ("department_id");--> statement-breakpoint
CREATE INDEX "department_member_index_profileId" ON "sta_department_members" ("profile_id");--> statement-breakpoint
CREATE INDEX "department_member_index_tenantId" ON "sta_department_members" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_item_attachment_item_file_unique" ON "sta_work_item_attachments" ("work_item_id","file_asset_id");--> statement-breakpoint
CREATE INDEX "workItemAttachment_index_tenantId" ON "sta_work_item_attachments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workItemAttachment_index_workItemId" ON "sta_work_item_attachments" ("work_item_id");--> statement-breakpoint
CREATE INDEX "workItemAttachment_index_fileAssetId" ON "sta_work_item_attachments" ("file_asset_id");--> statement-breakpoint
CREATE INDEX "workItemComment_index_tenantId" ON "sta_work_item_comments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workItemComment_index_workItemId_createdAt" ON "sta_work_item_comments" ("work_item_id","created_at");--> statement-breakpoint
CREATE INDEX "workItemComment_index_createdBy" ON "sta_work_item_comments" ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "work_item_comment_mention_unique" ON "sta_work_item_comment_mentions" ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "workItemCommentMention_index_tenantId" ON "sta_work_item_comment_mentions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workItemCommentMention_index_userId" ON "sta_work_item_comment_mentions" ("user_id");--> statement-breakpoint
ALTER TABLE "sta_departments" ADD CONSTRAINT "sta_departments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_departments" ADD CONSTRAINT "sta_departments_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_departments" ADD CONSTRAINT "sta_departments_updated_by_sta_profiles_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_department_id_sta_departments_id_fkey" FOREIGN KEY ("department_id") REFERENCES "sta_departments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_profile_id_sta_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_department_members" ADD CONSTRAINT "sta_department_members_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_project_id_sta_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "sta_projects"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_work_item_id_sta_work_items_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "sta_work_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_file_asset_id_sta_file_assets_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "sta_file_assets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_work_item_comments" ADD CONSTRAINT "sta_work_item_comments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_item_comments" ADD CONSTRAINT "sta_work_item_comments_work_item_id_sta_work_items_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "sta_work_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_item_comments" ADD CONSTRAINT "sta_work_item_comments_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_work_item_comment_mentions" ADD CONSTRAINT "sta_work_item_comment_mentions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_item_comment_mentions" ADD CONSTRAINT "sta_work_item_comment_mentions_0kBDY6XPyZeG_fkey" FOREIGN KEY ("comment_id") REFERENCES "sta_work_item_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_item_comment_mentions" ADD CONSTRAINT "sta_work_item_comment_mentions_user_id_sta_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_work_item_id_sta_work_items_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "sta_work_items"("id") ON DELETE CASCADE;