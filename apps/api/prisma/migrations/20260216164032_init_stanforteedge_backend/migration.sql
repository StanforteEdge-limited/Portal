-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('access', 'refresh', 'reset');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('group', 'venture', 'shared_function');

-- CreateEnum
CREATE TYPE "GroupUserRole" AS ENUM ('member', 'admin', 'moderator');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'payment_processing', 'disbursed', 'partially_disbursed', 'pending_retirement', 'retired');

-- CreateTable
CREATE TABLE "sta_profiles" (
    "id" BIGSERIAL NOT NULL,
    "wp_user_id" BIGINT,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "date_of_birth" DATE,
    "gender" VARCHAR(10),
    "phone" VARCHAR(30),
    "address" VARCHAR(255),
    "nationality" VARCHAR(100),
    "state" VARCHAR(100),
    "lga" VARCHAR(100),
    "marital_status" VARCHAR(30),
    "avatar" VARCHAR(255),
    "bio" TEXT,
    "occupation" VARCHAR(100),
    "employment_type" VARCHAR(20),
    "primary_organization_id" BIGINT,
    "last_login" TIMESTAMP(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_organizations" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "parent_organization_id" BIGINT,
    "organization_type" "OrganizationType" NOT NULL DEFAULT 'venture',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_profile_organizations" (
    "id" UUID NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_profile_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_roles" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_permissions" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_role_permissions" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sta_role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "sta_user_roles" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "organization_id" BIGINT,
    "is_primary_role" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sta_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_tokens" (
    "id" VARCHAR(255) NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "type" "TokenType" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "userAgent" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'info',
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(255),
    "data" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'unread',
    "read_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "sent_via" JSONB,
    "notifiable_type" VARCHAR(100),
    "notifiable_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_groups" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL DEFAULT 'general',
    "parent_id" BIGINT,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "organization_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_group_users" (
    "id" BIGSERIAL NOT NULL,
    "group_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role" "GroupUserRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" BIGINT,

    CONSTRAINT "sta_group_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_request_groups" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_request_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_request_types" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code_prefix" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "storage_type" VARCHAR(20),
    "form_schema" JSONB,
    "approval_flow_json" JSONB,
    "approval_limit" DECIMAL(15,2),
    "sequence_counter" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "form_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_request_instances" (
    "id" BIGSERIAL NOT NULL,
    "request_type_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "organization_id" BIGINT,
    "created_by" BIGINT NOT NULL,
    "team_id" BIGINT,
    "workflow_instance_id" UUID,
    "status" "RequestStatus" NOT NULL DEFAULT 'draft',
    "data" JSONB,
    "current_approval_step" INTEGER NOT NULL DEFAULT 0,
    "audit_log_id" UUID,
    "total_amount" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_request_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_request_items" (
    "id" UUID NOT NULL,
    "request_id" BIGINT NOT NULL,
    "category_id" UUID,
    "subcategory_id" UUID,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "due_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_workflows" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "entity_type" VARCHAR(100) NOT NULL,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_workflow_steps" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "step_type" VARCHAR(50) NOT NULL DEFAULT 'approval',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_initial" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_workflow_step_approvers" (
    "id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "approver_type" VARCHAR(10) NOT NULL,
    "approver_id" VARCHAR(64) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "approval_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_workflow_step_approvers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_workflow_transitions" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "from_step_id" UUID NOT NULL,
    "to_step_id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "action" VARCHAR(50) NOT NULL,
    "conditions" JSONB,
    "config" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_workflow_instances" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(36) NOT NULL,
    "current_step_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "initiated_by" BIGINT,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_workflow_history" (
    "id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "transition_id" UUID,
    "from_step_id" UUID,
    "to_step_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "performed_by" BIGINT,
    "comment" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_forms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(20) NOT NULL DEFAULT 'general',
    "storage_type" VARCHAR(20),
    "target_table" VARCHAR(100),
    "column_mapping" JSONB,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_pattern" JSONB,
    "workflow_enabled" BOOLEAN NOT NULL DEFAULT false,
    "workflow_statuses" JSONB,
    "created_by_profile_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_form_fields" (
    "id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "field_label" VARCHAR(255) NOT NULL,
    "field_type" VARCHAR(20) NOT NULL,
    "field_options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "validation_rules" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_form_assignments" (
    "id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "assigned_to_role" VARCHAR(100),
    "assigned_to_profile_id" BIGINT,
    "assigned_to_department_id" UUID,
    "visibility_roles" JSONB,
    "due_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_form_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_form_submissions" (
    "id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "submission_number" VARCHAR(50) NOT NULL,
    "submitted_by_profile_id" BIGINT NOT NULL,
    "organization_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'submitted',
    "assigned_to_profile_id" BIGINT,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_form_submission_data" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "value_text" VARCHAR(1000),
    "value_number" DECIMAL(15,4),
    "value_date" DATE,
    "value_datetime" TIMESTAMP(3),
    "value_file_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_form_submission_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_form_submission_history" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "action_type" VARCHAR(20) NOT NULL,
    "performed_by_profile_id" BIGINT,
    "old_value" TEXT,
    "new_value" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sta_form_submission_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_profiles_username_key" ON "sta_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sta_profiles_email_key" ON "sta_profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sta_organizations_code_key" ON "sta_organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sta_profile_organizations_profile_id_organization_id_key" ON "sta_profile_organizations"("profile_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_roles_slug_key" ON "sta_roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sta_permissions_slug_key" ON "sta_permissions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sta_user_roles_profile_id_role_id_organization_id_key" ON "sta_user_roles"("profile_id", "role_id", "organization_id");

-- CreateIndex
CREATE INDEX "sta_tokens_profile_id_idx" ON "sta_tokens"("profile_id");

-- CreateIndex
CREATE INDEX "sta_tokens_token_hash_idx" ON "sta_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "sta_tokens_type_idx" ON "sta_tokens"("type");

-- CreateIndex
CREATE INDEX "sta_tokens_expires_at_idx" ON "sta_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sta_tokens_token_hash_type_key" ON "sta_tokens"("token_hash", "type");

-- CreateIndex
CREATE INDEX "sta_notifications_user_id_idx" ON "sta_notifications"("user_id");

-- CreateIndex
CREATE INDEX "sta_notifications_type_idx" ON "sta_notifications"("type");

-- CreateIndex
CREATE INDEX "sta_notifications_status_idx" ON "sta_notifications"("status");

-- CreateIndex
CREATE INDEX "sta_notifications_notifiable_type_notifiable_id_idx" ON "sta_notifications"("notifiable_type", "notifiable_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_group_users_group_id_user_id_key" ON "sta_group_users"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_request_groups_code_key" ON "sta_request_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sta_request_types_group_id_code_prefix_key" ON "sta_request_types"("group_id", "code_prefix");

-- CreateIndex
CREATE INDEX "sta_request_instances_request_type_id_idx" ON "sta_request_instances"("request_type_id");

-- CreateIndex
CREATE INDEX "sta_request_instances_group_id_idx" ON "sta_request_instances"("group_id");

-- CreateIndex
CREATE INDEX "sta_request_instances_created_by_idx" ON "sta_request_instances"("created_by");

-- CreateIndex
CREATE INDEX "sta_request_instances_team_id_idx" ON "sta_request_instances"("team_id");

-- CreateIndex
CREATE INDEX "sta_request_instances_status_idx" ON "sta_request_instances"("status");

-- CreateIndex
CREATE INDEX "sta_request_instances_workflow_instance_id_idx" ON "sta_request_instances"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "sta_request_items_request_id_idx" ON "sta_request_items"("request_id");

-- CreateIndex
CREATE INDEX "sta_request_items_category_id_idx" ON "sta_request_items"("category_id");

-- CreateIndex
CREATE INDEX "sta_request_items_subcategory_id_idx" ON "sta_request_items"("subcategory_id");

-- CreateIndex
CREATE INDEX "sta_workflows_entity_type_idx" ON "sta_workflows"("entity_type");

-- CreateIndex
CREATE INDEX "sta_workflows_is_active_idx" ON "sta_workflows"("is_active");

-- CreateIndex
CREATE INDEX "sta_workflow_steps_workflow_id_idx" ON "sta_workflow_steps"("workflow_id");

-- CreateIndex
CREATE INDEX "sta_workflow_steps_order_idx" ON "sta_workflow_steps"("order");

-- CreateIndex
CREATE INDEX "sta_workflow_step_approvers_step_id_idx" ON "sta_workflow_step_approvers"("step_id");

-- CreateIndex
CREATE INDEX "sta_workflow_transitions_workflow_id_idx" ON "sta_workflow_transitions"("workflow_id");

-- CreateIndex
CREATE INDEX "sta_workflow_transitions_from_step_id_idx" ON "sta_workflow_transitions"("from_step_id");

-- CreateIndex
CREATE INDEX "sta_workflow_transitions_to_step_id_idx" ON "sta_workflow_transitions"("to_step_id");

-- CreateIndex
CREATE INDEX "sta_workflow_instances_workflow_id_idx" ON "sta_workflow_instances"("workflow_id");

-- CreateIndex
CREATE INDEX "sta_workflow_instances_status_idx" ON "sta_workflow_instances"("status");

-- CreateIndex
CREATE INDEX "sta_workflow_history_instance_id_idx" ON "sta_workflow_history"("instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_form_fields_form_id_field_key_key" ON "sta_form_fields"("form_id", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "sta_form_submissions_submission_number_key" ON "sta_form_submissions"("submission_number");

-- CreateIndex
CREATE UNIQUE INDEX "sta_form_submission_data_submission_id_field_id_key" ON "sta_form_submission_data"("submission_id", "field_id");

-- AddForeignKey
ALTER TABLE "sta_profiles" ADD CONSTRAINT "sta_profiles_primary_organization_id_fkey" FOREIGN KEY ("primary_organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_organizations" ADD CONSTRAINT "sta_organizations_parent_organization_id_fkey" FOREIGN KEY ("parent_organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_profile_organizations" ADD CONSTRAINT "sta_profile_organizations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_profile_organizations" ADD CONSTRAINT "sta_profile_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_role_permissions" ADD CONSTRAINT "sta_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "sta_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_role_permissions" ADD CONSTRAINT "sta_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "sta_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_user_roles" ADD CONSTRAINT "sta_user_roles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_user_roles" ADD CONSTRAINT "sta_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "sta_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_user_roles" ADD CONSTRAINT "sta_user_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_tokens" ADD CONSTRAINT "sta_tokens_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_groups" ADD CONSTRAINT "sta_groups_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_groups" ADD CONSTRAINT "sta_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_group_users" ADD CONSTRAINT "sta_group_users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "sta_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_group_users" ADD CONSTRAINT "sta_group_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_groups" ADD CONSTRAINT "sta_request_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_types" ADD CONSTRAINT "sta_request_types_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "sta_request_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_instances" ADD CONSTRAINT "sta_request_instances_request_type_id_fkey" FOREIGN KEY ("request_type_id") REFERENCES "sta_request_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_instances" ADD CONSTRAINT "sta_request_instances_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "sta_request_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_instances" ADD CONSTRAINT "sta_request_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_instances" ADD CONSTRAINT "sta_request_instances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_items" ADD CONSTRAINT "sta_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sta_request_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_steps" ADD CONSTRAINT "sta_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "sta_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_step_approvers" ADD CONSTRAINT "sta_workflow_step_approvers_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "sta_workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_transitions" ADD CONSTRAINT "sta_workflow_transitions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "sta_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_transitions" ADD CONSTRAINT "sta_workflow_transitions_from_step_id_fkey" FOREIGN KEY ("from_step_id") REFERENCES "sta_workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_transitions" ADD CONSTRAINT "sta_workflow_transitions_to_step_id_fkey" FOREIGN KEY ("to_step_id") REFERENCES "sta_workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_instances" ADD CONSTRAINT "sta_workflow_instances_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "sta_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_instances" ADD CONSTRAINT "sta_workflow_instances_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "sta_workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_workflow_history" ADD CONSTRAINT "sta_workflow_history_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "sta_workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_form_fields" ADD CONSTRAINT "sta_form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "sta_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_form_assignments" ADD CONSTRAINT "sta_form_assignments_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "sta_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_form_submissions" ADD CONSTRAINT "sta_form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "sta_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_form_submission_data" ADD CONSTRAINT "sta_form_submission_data_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "sta_form_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_form_submission_data" ADD CONSTRAINT "sta_form_submission_data_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "sta_form_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_form_submission_history" ADD CONSTRAINT "sta_form_submission_history_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "sta_form_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
