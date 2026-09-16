CREATE TABLE "sta_background_jobs" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"type" varchar(80) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"error" text,
	"notifiable" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"started_at" timestamp(6),
	"finished_at" timestamp(6)
);
--> statement-breakpoint
CREATE TABLE "sta_chat_conversations" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"type" varchar(20) DEFAULT 'direct' NOT NULL,
	"name" varchar(160),
	"description" text,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_chat_conversation_members" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"profile_id" bigint NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"last_read_at" timestamp(6),
	"joined_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_chat_messages" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"sender_profile_id" bigint NOT NULL,
	"body" text,
	"reply_to_message_id" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_chat_message_attachments" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"message_id" bigint NOT NULL,
	"file_asset_id" uuid NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_crm_accounts" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"industry" varchar(120),
	"website" varchar(255),
	"phone" varchar(30),
	"email" varchar(255),
	"type" varchar(30) DEFAULT 'customer' NOT NULL,
	"lifecycle_stage" varchar(30) DEFAULT 'prospect' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"owner_profile_id" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_crm_activities" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"account_id" bigint,
	"contact_id" bigint,
	"opportunity_id" bigint,
	"type" varchar(20) DEFAULT 'note' NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text,
	"due_at" timestamp(6),
	"done_at" timestamp(6),
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_crm_contacts" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"account_id" bigint,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120),
	"email" varchar(255),
	"phone" varchar(30),
	"job_title" varchar(160),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_crm_leads" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120),
	"email" varchar(255),
	"phone" varchar(30),
	"company" varchar(255),
	"source" varchar(60),
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"owner_profile_id" bigint,
	"converted_account_id" bigint,
	"converted_contact_id" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_crm_opportunities" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"account_id" bigint,
	"contact_id" bigint,
	"pipeline_id" bigint,
	"stage_id" bigint,
	"owner_profile_id" bigint,
	"name" varchar(255) NOT NULL,
	"amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"currency" varchar(12),
	"probability" integer DEFAULT 0 NOT NULL,
	"expected_close_date" timestamp(6),
	"source" varchar(60),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_crm_pipelines" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_crm_pipeline_stages" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"pipeline_id" bigint NOT NULL,
	"name" varchar(160) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"color" varchar(20),
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_storage_folders" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"parent_id" bigint,
	"name" varchar(255) NOT NULL,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sta_permissions" DROP CONSTRAINT "sta_permissions_slug_key";--> statement-breakpoint
ALTER TABLE "sta_roles" DROP CONSTRAINT "sta_roles_slug_key";--> statement-breakpoint
ALTER TABLE "sta_taxonomies" DROP CONSTRAINT "sta_taxonomies_key_key";--> statement-breakpoint
ALTER TABLE "sta_permissions" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_roles" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_role_permissions" ADD COLUMN "id" bigserial;--> statement-breakpoint
ALTER TABLE "sta_role_permissions" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_acknowledgements" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_forms" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_form_assignments" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_form_fields" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_form_submissions" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_form_submission_data" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_form_submission_history" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_policies" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_taxonomies" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_taxonomy_tag_assignments" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_taxonomy_terms" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_workflows" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_workflow_history" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_workflow_instances" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_workflow_steps" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_workflow_step_approvers" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_workflow_transitions" ADD COLUMN "tenant_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_file_assets" ADD COLUMN "folder_id" bigint;--> statement-breakpoint
ALTER TABLE "sta_profiles" DROP COLUMN "wp_user_id";--> statement-breakpoint
ALTER TABLE "sta_role_permissions" DROP CONSTRAINT "sta_role_permissions_pkey";--> statement-breakpoint
ALTER TABLE "sta_role_permissions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "sta_file_assets" ALTER COLUMN "storage_disk" SET DEFAULT 's3';--> statement-breakpoint
CREATE INDEX "background_job_idx_tenant_status" ON "sta_background_jobs" ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "background_job_idx_type" ON "sta_background_jobs" ("type");--> statement-breakpoint
CREATE INDEX "background_job_idx_created_at" ON "sta_background_jobs" ("created_at");--> statement-breakpoint
CREATE INDEX "chat_conversation_index_tenantId" ON "sta_chat_conversations" ("tenant_id");--> statement-breakpoint
CREATE INDEX "chat_conversation_index_createdBy" ON "sta_chat_conversations" ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_member_conversation_profile_unique" ON "sta_chat_conversation_members" ("conversation_id","profile_id");--> statement-breakpoint
CREATE INDEX "chat_member_index_tenantId" ON "sta_chat_conversation_members" ("tenant_id");--> statement-breakpoint
CREATE INDEX "chat_member_index_profileId" ON "sta_chat_conversation_members" ("profile_id");--> statement-breakpoint
CREATE INDEX "chat_message_index_tenantId" ON "sta_chat_messages" ("tenant_id");--> statement-breakpoint
CREATE INDEX "chat_message_index_conversationId_createdAt" ON "sta_chat_messages" ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_message_index_senderProfileId" ON "sta_chat_messages" ("sender_profile_id");--> statement-breakpoint
CREATE INDEX "chat_attachment_index_tenantId" ON "sta_chat_message_attachments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "chat_attachment_index_messageId" ON "sta_chat_message_attachments" ("message_id");--> statement-breakpoint
CREATE INDEX "chat_attachment_index_fileAssetId" ON "sta_chat_message_attachments" ("file_asset_id");--> statement-breakpoint
CREATE INDEX "crm_account_index_tenantId" ON "sta_crm_accounts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "crm_account_index_ownerProfileId" ON "sta_crm_accounts" ("owner_profile_id");--> statement-breakpoint
CREATE INDEX "crm_activity_index_tenantId" ON "sta_crm_activities" ("tenant_id");--> statement-breakpoint
CREATE INDEX "crm_activity_index_accountId" ON "sta_crm_activities" ("account_id");--> statement-breakpoint
CREATE INDEX "crm_activity_index_contactId" ON "sta_crm_activities" ("contact_id");--> statement-breakpoint
CREATE INDEX "crm_activity_index_opportunityId" ON "sta_crm_activities" ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_contact_email_tenant_unique" ON "sta_crm_contacts" ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "crm_contact_index_tenantId" ON "sta_crm_contacts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "crm_contact_index_accountId" ON "sta_crm_contacts" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_lead_email_tenant_unique" ON "sta_crm_leads" ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "crm_lead_index_tenantId" ON "sta_crm_leads" ("tenant_id");--> statement-breakpoint
CREATE INDEX "crm_lead_index_ownerProfileId" ON "sta_crm_leads" ("owner_profile_id");--> statement-breakpoint
CREATE INDEX "crm_lead_index_status" ON "sta_crm_leads" ("status");--> statement-breakpoint
CREATE INDEX "crm_opportunity_index_tenantId" ON "sta_crm_opportunities" ("tenant_id");--> statement-breakpoint
CREATE INDEX "crm_opportunity_index_accountId" ON "sta_crm_opportunities" ("account_id");--> statement-breakpoint
CREATE INDEX "crm_opportunity_index_stageId" ON "sta_crm_opportunities" ("stage_id");--> statement-breakpoint
CREATE INDEX "crm_opportunity_index_ownerProfileId" ON "sta_crm_opportunities" ("owner_profile_id");--> statement-breakpoint
CREATE INDEX "crm_pipeline_index_tenantId" ON "sta_crm_pipelines" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_pipeline_stage_position_unique" ON "sta_crm_pipeline_stages" ("pipeline_id","position");--> statement-breakpoint
CREATE INDEX "crm_pipeline_stage_index_tenantId" ON "sta_crm_pipeline_stages" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_global_slug_unique" ON "sta_permissions" ("slug") WHERE ("tenant_id" is null);--> statement-breakpoint
CREATE UNIQUE INDEX "permission_tenant_slug_unique" ON "sta_permissions" ("slug","tenant_id");--> statement-breakpoint
CREATE INDEX "permission_index_tenantId" ON "sta_permissions" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_global_slug_unique" ON "sta_roles" ("slug") WHERE ("tenant_id" is null);--> statement-breakpoint
CREATE UNIQUE INDEX "role_tenant_slug_unique" ON "sta_roles" ("slug","tenant_id");--> statement-breakpoint
CREATE INDEX "role_index_tenantId" ON "sta_roles" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permission_global_unique" ON "sta_role_permissions" ("role_id","permission_id") WHERE ("tenant_id" is null);--> statement-breakpoint
CREATE UNIQUE INDEX "role_permission_tenant_unique" ON "sta_role_permissions" ("role_id","permission_id","tenant_id");--> statement-breakpoint
CREATE INDEX "rolePermission_index_tenantId" ON "sta_role_permissions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "acknowledgement_index_tenantId" ON "sta_acknowledgements" ("tenant_id");--> statement-breakpoint
CREATE INDEX "form_index_tenantId" ON "sta_forms" ("tenant_id");--> statement-breakpoint
CREATE INDEX "formAssignment_index_tenantId" ON "sta_form_assignments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "formField_index_tenantId" ON "sta_form_fields" ("tenant_id");--> statement-breakpoint
CREATE INDEX "formSubmission_index_tenantId" ON "sta_form_submissions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "formSubmissionData_index_tenantId" ON "sta_form_submission_data" ("tenant_id");--> statement-breakpoint
CREATE INDEX "formSubmissionHistory_index_tenantId" ON "sta_form_submission_history" ("tenant_id");--> statement-breakpoint
CREATE INDEX "policy_index_tenantId" ON "sta_policies" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_unique_key_tenant" ON "sta_taxonomies" ("key","tenant_id");--> statement-breakpoint
CREATE INDEX "taxonomy_index_tenantId" ON "sta_taxonomies" ("tenant_id");--> statement-breakpoint
CREATE INDEX "taxonomyTagAssignment_index_tenantId" ON "sta_taxonomy_tag_assignments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "taxonomyTerm_index_tenantId" ON "sta_taxonomy_terms" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflow_index_tenantId" ON "sta_workflows" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflowHistory_index_tenantId" ON "sta_workflow_history" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflowInstance_index_tenantId" ON "sta_workflow_instances" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflowStep_index_tenantId" ON "sta_workflow_steps" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflowStepApprover_index_tenantId" ON "sta_workflow_step_approvers" ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflowTransition_index_tenantId" ON "sta_workflow_transitions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "fileAsset_index_folderId" ON "sta_file_assets" ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storage_folder_tenant_parent_name_unique" ON "sta_storage_folders" ("tenant_id","parent_id","name");--> statement-breakpoint
CREATE INDEX "storage_folder_index_tenantId" ON "sta_storage_folders" ("tenant_id");--> statement-breakpoint
CREATE INDEX "storage_folder_index_parentId" ON "sta_storage_folders" ("parent_id");--> statement-breakpoint
ALTER TABLE "sta_analytics_events" ADD CONSTRAINT "sta_analytics_events_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_background_jobs" ADD CONSTRAINT "sta_background_jobs_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_background_jobs" ADD CONSTRAINT "sta_background_jobs_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_chat_conversations" ADD CONSTRAINT "sta_chat_conversations_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_conversations" ADD CONSTRAINT "sta_chat_conversations_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_chat_conversation_members" ADD CONSTRAINT "sta_chat_conversation_members_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_conversation_members" ADD CONSTRAINT "sta_chat_conversation_members_yOKzK0oFZMT0_fkey" FOREIGN KEY ("conversation_id") REFERENCES "sta_chat_conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_conversation_members" ADD CONSTRAINT "sta_chat_conversation_members_profile_id_sta_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_messages" ADD CONSTRAINT "sta_chat_messages_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_messages" ADD CONSTRAINT "sta_chat_messages_N4HYdDW2MNqJ_fkey" FOREIGN KEY ("conversation_id") REFERENCES "sta_chat_conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_messages" ADD CONSTRAINT "sta_chat_messages_sender_profile_id_sta_profiles_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_messages" ADD CONSTRAINT "sta_chat_messages_reply_to_message_id_sta_chat_messages_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "sta_chat_messages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_chat_message_attachments" ADD CONSTRAINT "sta_chat_message_attachments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_message_attachments" ADD CONSTRAINT "sta_chat_message_attachments_DvUuX8oJgGQJ_fkey" FOREIGN KEY ("message_id") REFERENCES "sta_chat_messages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_chat_message_attachments" ADD CONSTRAINT "sta_chat_message_attachments_xU22q5BlbGZM_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "sta_file_assets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_groups" ADD CONSTRAINT "sta_groups_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_group_organizations" ADD CONSTRAINT "sta_group_organizations_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_group_user_organization_scopes" ADD CONSTRAINT "sta_group_user_organization_scopes_euDxmcYZ8rCA_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_email_logs" ADD CONSTRAINT "sta_email_logs_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_accounts" ADD CONSTRAINT "sta_crm_accounts_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_accounts" ADD CONSTRAINT "sta_crm_accounts_owner_profile_id_sta_profiles_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_activities" ADD CONSTRAINT "sta_crm_activities_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_activities" ADD CONSTRAINT "sta_crm_activities_account_id_sta_crm_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_crm_accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_activities" ADD CONSTRAINT "sta_crm_activities_contact_id_sta_crm_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_crm_contacts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_activities" ADD CONSTRAINT "sta_crm_activities_opportunity_id_sta_crm_opportunities_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sta_crm_opportunities"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_activities" ADD CONSTRAINT "sta_crm_activities_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_contacts" ADD CONSTRAINT "sta_crm_contacts_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_contacts" ADD CONSTRAINT "sta_crm_contacts_account_id_sta_crm_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_crm_accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_leads" ADD CONSTRAINT "sta_crm_leads_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_leads" ADD CONSTRAINT "sta_crm_leads_owner_profile_id_sta_profiles_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_leads" ADD CONSTRAINT "sta_crm_leads_converted_account_id_sta_crm_accounts_id_fkey" FOREIGN KEY ("converted_account_id") REFERENCES "sta_crm_accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_leads" ADD CONSTRAINT "sta_crm_leads_converted_contact_id_sta_crm_contacts_id_fkey" FOREIGN KEY ("converted_contact_id") REFERENCES "sta_crm_contacts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_opportunities" ADD CONSTRAINT "sta_crm_opportunities_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_opportunities" ADD CONSTRAINT "sta_crm_opportunities_account_id_sta_crm_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sta_crm_accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_opportunities" ADD CONSTRAINT "sta_crm_opportunities_contact_id_sta_crm_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sta_crm_contacts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_opportunities" ADD CONSTRAINT "sta_crm_opportunities_pipeline_id_sta_crm_pipelines_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "sta_crm_pipelines"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_opportunities" ADD CONSTRAINT "sta_crm_opportunities_stage_id_sta_crm_pipeline_stages_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "sta_crm_pipeline_stages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_opportunities" ADD CONSTRAINT "sta_crm_opportunities_owner_profile_id_sta_profiles_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_crm_pipelines" ADD CONSTRAINT "sta_crm_pipelines_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_pipeline_stages" ADD CONSTRAINT "sta_crm_pipeline_stages_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_crm_pipeline_stages" ADD CONSTRAINT "sta_crm_pipeline_stages_pipeline_id_sta_crm_pipelines_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "sta_crm_pipelines"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_accounts" ADD CONSTRAINT "sta_finance_accounts_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_budgets" ADD CONSTRAINT "sta_finance_budgets_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_expenses" ADD CONSTRAINT "sta_finance_expenses_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_funds" ADD CONSTRAINT "sta_finance_funds_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_journal_entries" ADD CONSTRAINT "sta_finance_journal_entries_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_journal_lines" ADD CONSTRAINT "sta_finance_journal_lines_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_journal_sequences" ADD CONSTRAINT "sta_finance_journal_sequences_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_ledger_entries" ADD CONSTRAINT "sta_finance_ledger_entries_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_finance_reporting_periods" ADD CONSTRAINT "sta_finance_reporting_periods_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_procurement_orders" ADD CONSTRAINT "sta_procurement_orders_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_procurement_requisitions" ADD CONSTRAINT "sta_procurement_requisitions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_attendance_corrections" ADD CONSTRAINT "sta_attendance_corrections_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_attendance_daily" ADD CONSTRAINT "sta_attendance_daily_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_attendance_entries" ADD CONSTRAINT "sta_attendance_entries_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_attendance_exceptions" ADD CONSTRAINT "sta_attendance_exceptions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_attendance_holidays" ADD CONSTRAINT "sta_attendance_holidays_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_employee_profiles" ADD CONSTRAINT "sta_employee_profiles_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_leave_balance_ledger" ADD CONSTRAINT "sta_leave_balance_ledger_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_leave_requests" ADD CONSTRAINT "sta_leave_requests_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_leave_types" ADD CONSTRAINT "sta_leave_types_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_payroll_runs" ADD CONSTRAINT "sta_payroll_runs_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_payroll_workers" ADD CONSTRAINT "sta_payroll_workers_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_permissions" ADD CONSTRAINT "sta_permissions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_roles" ADD CONSTRAINT "sta_roles_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_role_permissions" ADD CONSTRAINT "sta_role_permissions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_notifications" ADD CONSTRAINT "sta_notifications_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_notification_jobs" ADD CONSTRAINT "sta_notification_jobs_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_projects" ADD CONSTRAINT "sta_projects_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_billing_invoices" ADD CONSTRAINT "sta_billing_invoices_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_billing_invoices" ADD CONSTRAINT "sta_billing_invoices_fZJJADFUF7Eg_fkey" FOREIGN KEY ("subscription_id") REFERENCES "sta_tenant_subscriptions"("id");--> statement-breakpoint
ALTER TABLE "sta_billing_invoices" ADD CONSTRAINT "sta_billing_invoices_plan_id_sta_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "sta_subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "sta_billing_payment_attempts" ADD CONSTRAINT "sta_billing_payment_attempts_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_billing_payment_attempts" ADD CONSTRAINT "sta_billing_payment_attempts_dASlY9oQToAO_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sta_billing_invoices"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_subscription_plan_prices" ADD CONSTRAINT "sta_subscription_plan_prices_FiRuKBu8KjlB_fkey" FOREIGN KEY ("plan_id") REFERENCES "sta_subscription_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_tenant_subscriptions" ADD CONSTRAINT "sta_tenant_subscriptions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_tenant_subscriptions" ADD CONSTRAINT "sta_tenant_subscriptions_plan_id_sta_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "sta_subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "sta_acknowledgements" ADD CONSTRAINT "sta_acknowledgements_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_forms" ADD CONSTRAINT "sta_forms_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_form_assignments" ADD CONSTRAINT "sta_form_assignments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_form_fields" ADD CONSTRAINT "sta_form_fields_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_form_submissions" ADD CONSTRAINT "sta_form_submissions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_form_submission_data" ADD CONSTRAINT "sta_form_submission_data_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_form_submission_history" ADD CONSTRAINT "sta_form_submission_history_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_policies" ADD CONSTRAINT "sta_policies_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_request_groups" ADD CONSTRAINT "sta_request_groups_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_request_instances" ADD CONSTRAINT "sta_request_instances_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_taxonomies" ADD CONSTRAINT "sta_taxonomies_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_taxonomy_tag_assignments" ADD CONSTRAINT "sta_taxonomy_tag_assignments_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_taxonomy_terms" ADD CONSTRAINT "sta_taxonomy_terms_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_workflows" ADD CONSTRAINT "sta_workflows_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_workflow_history" ADD CONSTRAINT "sta_workflow_history_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_workflow_instances" ADD CONSTRAINT "sta_workflow_instances_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_workflow_steps" ADD CONSTRAINT "sta_workflow_steps_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_workflow_step_approvers" ADD CONSTRAINT "sta_workflow_step_approvers_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_workflow_transitions" ADD CONSTRAINT "sta_workflow_transitions_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_file_assets" ADD CONSTRAINT "sta_file_assets_folder_id_sta_storage_folders_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "sta_storage_folders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_storage_folders" ADD CONSTRAINT "sta_storage_folders_tenant_id_sta_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sta_storage_folders" ADD CONSTRAINT "sta_storage_folders_parent_id_sta_storage_folders_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sta_storage_folders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sta_storage_folders" ADD CONSTRAINT "sta_storage_folders_created_by_sta_profiles_id_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL;