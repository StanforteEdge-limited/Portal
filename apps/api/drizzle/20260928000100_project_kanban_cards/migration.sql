CREATE TABLE "sta_project_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" bigint NOT NULL,
  "project_id" bigint NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(50) DEFAULT 'todo' NOT NULL,
  "position" numeric(20, 6) DEFAULT '0' NOT NULL,
  "color" varchar(40),
  "tags" jsonb,
  "assigned_to_id" bigint,
  "due_date" date,
  "metadata" jsonb,
  "created_by" bigint,
  "updated_by" bigint,
  "created_at" timestamp(6) DEFAULT now() NOT NULL,
  "updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_project_card_attachments" (
  "id" bigserial PRIMARY KEY,
  "tenant_id" bigint NOT NULL,
  "card_id" uuid NOT NULL,
  "file_asset_id" uuid NOT NULL,
  "label" varchar(150),
  "created_by" bigint,
  "created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_project_card_updates" (
  "id" bigserial PRIMARY KEY,
  "tenant_id" bigint NOT NULL,
  "card_id" uuid NOT NULL,
  "body" text NOT NULL,
  "metadata" jsonb,
  "created_by" bigint,
  "created_at" timestamp(6) DEFAULT now() NOT NULL,
  "updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_project_card_update_mentions" (
  "id" bigserial PRIMARY KEY,
  "tenant_id" bigint NOT NULL,
  "update_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sta_project_cards" ADD CONSTRAINT "sta_project_cards_tenant_id_sta_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sta_tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_cards" ADD CONSTRAINT "sta_project_cards_project_id_sta_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."sta_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_cards" ADD CONSTRAINT "sta_project_cards_assigned_to_id_sta_profiles_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."sta_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_cards" ADD CONSTRAINT "sta_project_cards_created_by_sta_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sta_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_cards" ADD CONSTRAINT "sta_project_cards_updated_by_sta_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."sta_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_attachments" ADD CONSTRAINT "sta_project_card_attachments_tenant_id_sta_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sta_tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_attachments" ADD CONSTRAINT "sta_project_card_attachments_card_id_sta_project_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."sta_project_cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_attachments" ADD CONSTRAINT "sta_project_card_attachments_file_asset_id_sta_file_assets_id_fk" FOREIGN KEY ("file_asset_id") REFERENCES "public"."sta_file_assets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_attachments" ADD CONSTRAINT "sta_project_card_attachments_created_by_sta_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sta_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_updates" ADD CONSTRAINT "sta_project_card_updates_tenant_id_sta_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sta_tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_updates" ADD CONSTRAINT "sta_project_card_updates_card_id_sta_project_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."sta_project_cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_updates" ADD CONSTRAINT "sta_project_card_updates_created_by_sta_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sta_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_update_mentions" ADD CONSTRAINT "sta_project_card_update_mentions_tenant_id_sta_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sta_tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_update_mentions" ADD CONSTRAINT "sta_project_card_update_mentions_update_id_sta_project_card_updates_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."sta_project_card_updates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sta_project_card_update_mentions" ADD CONSTRAINT "sta_project_card_update_mentions_user_id_sta_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sta_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "projectCard_index_tenantId_projectId" ON "sta_project_cards" USING btree ("tenant_id","project_id");
--> statement-breakpoint
CREATE INDEX "projectCard_index_projectId_status_position" ON "sta_project_cards" USING btree ("project_id","status","position");
--> statement-breakpoint
CREATE INDEX "projectCard_index_assignedToId" ON "sta_project_cards" USING btree ("assigned_to_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_card_attachment_card_file_unique" ON "sta_project_card_attachments" USING btree ("card_id","file_asset_id");
--> statement-breakpoint
CREATE INDEX "projectCardAttachment_index_tenantId" ON "sta_project_card_attachments" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "projectCardAttachment_index_cardId" ON "sta_project_card_attachments" USING btree ("card_id");
--> statement-breakpoint
CREATE INDEX "projectCardAttachment_index_fileAssetId" ON "sta_project_card_attachments" USING btree ("file_asset_id");
--> statement-breakpoint
CREATE INDEX "projectCardUpdate_index_tenantId" ON "sta_project_card_updates" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "projectCardUpdate_index_cardId_createdAt" ON "sta_project_card_updates" USING btree ("card_id","created_at");
--> statement-breakpoint
CREATE INDEX "projectCardUpdate_index_createdBy" ON "sta_project_card_updates" USING btree ("created_by");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_card_update_mention_unique" ON "sta_project_card_update_mentions" USING btree ("update_id","user_id");
--> statement-breakpoint
CREATE INDEX "projectCardUpdateMention_index_tenantId" ON "sta_project_card_update_mentions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "projectCardUpdateMention_index_userId" ON "sta_project_card_update_mentions" USING btree ("user_id");
