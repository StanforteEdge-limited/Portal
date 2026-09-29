-- Task comments, mentions, attachments, tags and colour now live on the work
-- item. The `sta_project_cards` stack was a second, unused kanban model hanging
-- off the same project, so it is dropped here.
ALTER TABLE "sta_work_items" ADD COLUMN "color" varchar(40);
--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD COLUMN "tags" jsonb;
--> statement-breakpoint
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_project_id_sta_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "sta_projects"("id") ON DELETE set null NOT VALID;
--> statement-breakpoint
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_work_item_id_sta_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "sta_work_items"("id") ON DELETE cascade NOT VALID;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "sta_work_items" w
    WHERE w."project_id" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "sta_projects" p WHERE p."id" = w."project_id")
  ) THEN
    ALTER TABLE "sta_work_items" VALIDATE CONSTRAINT "sta_work_items_project_id_sta_projects_id_fk";
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "sta_work_logs" l
    WHERE NOT EXISTS (SELECT 1 FROM "sta_work_items" w WHERE w."id" = l."work_item_id")
  ) THEN
    ALTER TABLE "sta_work_logs" VALIDATE CONSTRAINT "sta_work_logs_work_item_id_sta_work_items_id_fk";
  END IF;
END $$;
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
ALTER TABLE "sta_work_item_comments" ADD CONSTRAINT "sta_work_item_comments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_comments" ADD CONSTRAINT "sta_work_item_comments_work_item_id_sta_work_items_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "sta_work_items"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_comments" ADD CONSTRAINT "sta_work_item_comments_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "sta_work_item_comment_mentions" ADD CONSTRAINT "sta_work_item_comment_mentions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_comment_mentions" ADD CONSTRAINT "sta_work_item_comment_mentions_comment_id_sta_work_item_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "sta_work_item_comments"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_comment_mentions" ADD CONSTRAINT "sta_work_item_comment_mentions_user_id_sta_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_work_item_id_sta_work_items_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "sta_work_items"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_file_asset_id_sta_file_assets_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "sta_file_assets"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sta_work_item_attachments" ADD CONSTRAINT "sta_work_item_attachments_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX "workItemComment_index_tenantId" ON "sta_work_item_comments" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "workItemComment_index_workItemId_createdAt" ON "sta_work_item_comments" USING btree ("work_item_id","created_at");
--> statement-breakpoint
CREATE INDEX "workItemComment_index_createdBy" ON "sta_work_item_comments" USING btree ("created_by");
--> statement-breakpoint
CREATE UNIQUE INDEX "work_item_comment_mention_unique" ON "sta_work_item_comment_mentions" USING btree ("comment_id","user_id");
--> statement-breakpoint
CREATE INDEX "workItemCommentMention_index_tenantId" ON "sta_work_item_comment_mentions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "workItemCommentMention_index_userId" ON "sta_work_item_comment_mentions" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "work_item_attachment_item_file_unique" ON "sta_work_item_attachments" USING btree ("work_item_id","file_asset_id");
--> statement-breakpoint
CREATE INDEX "workItemAttachment_index_tenantId" ON "sta_work_item_attachments" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "workItemAttachment_index_workItemId" ON "sta_work_item_attachments" USING btree ("work_item_id");
--> statement-breakpoint
CREATE INDEX "workItemAttachment_index_fileAssetId" ON "sta_work_item_attachments" USING btree ("file_asset_id");
--> statement-breakpoint
DROP TABLE IF EXISTS "sta_project_card_update_mentions";
--> statement-breakpoint
DROP TABLE IF EXISTS "sta_project_card_updates";
--> statement-breakpoint
DROP TABLE IF EXISTS "sta_project_card_attachments";
--> statement-breakpoint
DROP TABLE IF EXISTS "sta_project_cards";
