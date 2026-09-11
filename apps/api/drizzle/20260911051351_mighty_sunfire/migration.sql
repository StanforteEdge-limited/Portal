CREATE TYPE "employment_status" AS ENUM('draft', 'active', 'suspended', 'exited');--> statement-breakpoint
CREATE TYPE "employment_type" AS ENUM('full_time', 'contract', 'intern', 'consultant');--> statement-breakpoint
CREATE TYPE "grn_status" AS ENUM('pending', 'confirmed', 'disputed');--> statement-breakpoint
CREATE TYPE "group_user_role" AS ENUM('member', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "mail_provider" AS ENUM('GOOGLE', 'MICROSOFT');--> statement-breakpoint
CREATE TYPE "onboarding_status" AS ENUM('invited', 'accepted', 'profile_pending', 'forms_pending', 'hr_review', 'completed');--> statement-breakpoint
CREATE TYPE "organization_type" AS ENUM('group', 'venture', 'shared_function');--> statement-breakpoint
CREATE TYPE "payment_pattern" AS ENUM('post_delivery', 'pre_payment', 'milestone');--> statement-breakpoint
CREATE TYPE "po_status" AS ENUM('draft', 'pending_approval', 'approved', 'sent', 'acknowledged', 'partially_received', 'received', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "procurement_category" AS ENUM('goods', 'services', 'works');--> statement-breakpoint
CREATE TYPE "procurement_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'returned', 'converted_to_po', 'cancelled');--> statement-breakpoint
CREATE TYPE "request_status" AS ENUM('draft', 'returned', 'sent', 'approval', 'cleared', 'approved', 'rejected', 'cancelled', 'payment_processing', 'disbursed', 'confirmed', 'partially_disbursed', 'pending_retirement', 'retired', 'completed');--> statement-breakpoint
CREATE TYPE "token_type" AS ENUM('access', 'refresh', 'reset', 'invite');--> statement-breakpoint
CREATE TYPE "work_item_status" AS ENUM('planned', 'in_progress', 'completed', 'blocked', 'carried_over', 'cancelled');--> statement-breakpoint
CREATE TYPE "work_item_type" AS ENUM('weekly_task', 'daily_task', 'project_activity', 'recurring_responsibility', 'ad_hoc');--> statement-breakpoint
CREATE TYPE "work_log_approval_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "work_mode" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TYPE "work_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "sta_email_logs" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"user_id" bigint,
	"to_email" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body_text" text,
	"body_html" text,
	"thread_key" varchar(191),
	"provider" varchar(50),
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"message_id" varchar(255),
	"error_message" text,
	"notifiable_type" varchar(100),
	"notifiable_id" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_notifications" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"user_id" bigint NOT NULL,
	"type" varchar(50) DEFAULT 'info' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link" varchar(255),
	"data" jsonb,
	"status" varchar(20) DEFAULT 'unread' NOT NULL,
	"read_at" timestamp(6),
	"archived_at" timestamp(6),
	"sent_via" jsonb,
	"notifiable_type" varchar(100),
	"notifiable_id" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_permissions" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(50) NOT NULL,
	"description" text,
	"slug" varchar(50) NOT NULL UNIQUE,
	"module" varchar(50),
	"created_at" timestamp(6) NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_profiles" (
	"id" bigserial PRIMARY KEY,
	"wp_user_id" bigint,
	"username" varchar(100) UNIQUE,
	"email" varchar(255) NOT NULL UNIQUE,
	"password_hash" varchar(255),
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"date_of_birth" date,
	"gender" varchar(10),
	"phone" varchar(30),
	"address" varchar(255),
	"nationality" varchar(100),
	"state" varchar(100),
	"lga" varchar(100),
	"marital_status" varchar(30),
	"avatar" varchar(255),
	"bio" text,
	"occupation" varchar(100),
	"employment_type" varchar(20),
	"primary_organization_id" bigint,
	"signature_file_id" uuid,
	"last_login" timestamp(6),
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"lockout_until" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_roles" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(50) NOT NULL,
	"description" text,
	"slug" varchar(50) NOT NULL UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_role_permissions" (
	"role_id" bigint NOT NULL,
	"permission_id" bigint NOT NULL,
	"assigned_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_tokens" (
	"id" varchar(255) PRIMARY KEY,
	"profile_id" bigint NOT NULL,
	"tenant_id" bigint,
	"type" "token_type" NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp(6) NOT NULL,
	"last_used_at" timestamp(6),
	"user_agent" text,
	"ip_address" varchar(45),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_user_roles" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"profile_id" bigint NOT NULL,
	"role_id" bigint NOT NULL,
	"organization_id" bigint,
	"is_primary_role" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp(6) DEFAULT now() NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"user_id" bigint NOT NULL,
	"attendance_daily_id" uuid,
	"attendance_entry_id" uuid,
	"office_location_id" bigint,
	"request_type" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp(6) DEFAULT now() NOT NULL,
	"requested_by" bigint NOT NULL,
	"reviewed_at" timestamp(6),
	"reviewed_by" bigint,
	"reason" text NOT NULL,
	"work_date" date NOT NULL,
	"proposed_at" timestamp(6),
	"proposed_mode" varchar(30),
	"proposed_office_location_id" bigint,
	"proposed_latitude" numeric(10,7),
	"proposed_longitude" numeric(10,7),
	"review_notes" text,
	"snapshot_json" jsonb,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_attendance_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"user_id" bigint NOT NULL,
	"work_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'absent' NOT NULL,
	"attendance_mode" varchar(30),
	"expected_mode" varchar(30),
	"reconciliation_status" varchar(30),
	"office_location_id" bigint,
	"geofence_status" varchar(30),
	"scheduled_minutes" integer DEFAULT 0 NOT NULL,
	"worked_minutes" integer DEFAULT 0 NOT NULL,
	"late_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"first_in_at" timestamp(6),
	"last_out_at" timestamp(6),
	"policy_snapshot" jsonb,
	"computed_at" timestamp(6) DEFAULT now() NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_attendance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"user_id" bigint NOT NULL,
	"entry_type" varchar(30) NOT NULL,
	"entry_at" timestamp(6) NOT NULL,
	"work_date" date NOT NULL,
	"attendance_mode" varchar(30),
	"office_location_id" bigint,
	"latitude" numeric(10,7),
	"longitude" numeric(10,7),
	"geofence_status" varchar(30),
	"source" varchar(30) DEFAULT 'web' NOT NULL,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_attendance_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"user_id" bigint NOT NULL,
	"attendance_daily_id" uuid,
	"attendance_entry_id" uuid,
	"office_location_id" bigint,
	"exception_type" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"work_date" date NOT NULL,
	"attendance_mode" varchar(30),
	"reason" text NOT NULL,
	"notes" text,
	"created_by" bigint NOT NULL,
	"reviewed_by" bigint,
	"reviewed_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_attendance_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"office_location_id" bigint,
	"holiday_date" date NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_employee_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" bigint NOT NULL,
	"meta_key" varchar(120) NOT NULL,
	"meta_value" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_employee_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"user_id" bigint NOT NULL UNIQUE,
	"employee_code" varchar(60) UNIQUE,
	"job_title" varchar(120),
	"job_description" text,
	"manager_user_id" bigint,
	"employment_type" "employment_type",
	"employment_status" "employment_status" DEFAULT 'draft'::"employment_status" NOT NULL,
	"hire_date" date,
	"confirmation_date" date,
	"exit_date" date,
	"work_mode" "work_mode",
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL,
	"designation_id" bigint
);
--> statement-breakpoint
CREATE TABLE "sta_hr_designations" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"code" varchar(20) UNIQUE,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"document_id" uuid,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_leave_balance_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"user_id" bigint NOT NULL,
	"leave_type_key" varchar(100) NOT NULL,
	"period_year" integer NOT NULL,
	"delta_days" numeric(7,2) NOT NULL,
	"entry_type" varchar(30) NOT NULL,
	"source_request_id" bigint,
	"notes" text,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_onboarding_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" bigint NOT NULL UNIQUE,
	"status" "onboarding_status" DEFAULT 'invited'::"onboarding_status" NOT NULL,
	"current_step" varchar(80),
	"steps_json" jsonb,
	"due_date" date,
	"completed_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_groups" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) DEFAULT 'general' NOT NULL,
	"parent_id" bigint,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"organization_id" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_group_organizations" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"group_id" bigint NOT NULL,
	"organization_id" bigint NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_group_users" (
	"id" bigserial PRIMARY KEY,
	"group_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"role" "group_user_role" DEFAULT 'member'::"group_user_role" NOT NULL,
	"joined_at" timestamp(6) DEFAULT now() NOT NULL,
	"added_by" bigint,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_group_user_organization_scopes" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"group_user_id" bigint NOT NULL,
	"organization_id" bigint NOT NULL,
	"scope_role" varchar(50),
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_office_locations" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"address" varchar(255),
	"latitude" numeric(10,7) NOT NULL,
	"longitude" numeric(10,7) NOT NULL,
	"radius_meters" integer DEFAULT 150 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_organizations" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL UNIQUE,
	"parent_organization_id" bigint,
	"organization_type" "organization_type" DEFAULT 'venture'::"organization_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_organization_office_locations" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"organization_id" bigint NOT NULL,
	"office_location_id" bigint NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_profile_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"profile_id" bigint NOT NULL,
	"organization_id" bigint NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_projects" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"organization_id" bigint,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_project_governance" (
	"id" bigserial PRIMARY KEY,
	"project_id" bigint NOT NULL UNIQUE,
	"project_code" varchar(50),
	"owner_user_id" bigint,
	"start_date" date,
	"end_date" date,
	"governance_status" varchar(30) DEFAULT 'planned' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "sta_project_members" (
	"id" bigserial PRIMARY KEY,
	"project_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"role" "group_user_role" DEFAULT 'member'::"group_user_role" NOT NULL,
	"joined_at" timestamp(6) DEFAULT now() NOT NULL,
	"added_by" bigint,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_project_timesheet_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source_work_log_id" uuid UNIQUE,
	"worker_id" uuid NOT NULL,
	"component_id" uuid,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"synced_run_id" uuid,
	"work_date" date NOT NULL,
	"hours" numeric(10,2) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"approved_by" bigint,
	"approved_at" timestamp(6),
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_team_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" bigint,
	"team_id" bigint,
	"owner_user_id" bigint,
	"created_by_id" bigint,
	"title" varchar(255) NOT NULL,
	"description" text,
	"period_year" integer NOT NULL,
	"period_type" varchar(20) DEFAULT 'annual' NOT NULL,
	"period_label" varchar(80),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"weight" numeric(8,2),
	"start_date" date,
	"end_date" date,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_team_kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"goal_id" uuid,
	"objective_id" uuid,
	"organization_id" bigint,
	"team_id" bigint,
	"owner_user_id" bigint,
	"created_by_id" bigint,
	"title" varchar(255) NOT NULL,
	"description" text,
	"target_type" varchar(30),
	"target_value" numeric(15,2),
	"unit_label" varchar(50),
	"period_year" integer,
	"quarter" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"weight" numeric(8,2),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_team_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"goal_id" uuid,
	"organization_id" bigint,
	"team_id" bigint,
	"owner_user_id" bigint,
	"created_by_id" bigint,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"weight" numeric(8,2),
	"due_date" date,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_work_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(255) NOT NULL,
	"description" text,
	"item_type" "work_item_type" DEFAULT 'weekly_task'::"work_item_type" NOT NULL,
	"status" "work_item_status" DEFAULT 'planned'::"work_item_status" NOT NULL,
	"priority" "work_priority" DEFAULT 'medium'::"work_priority" NOT NULL,
	"organization_id" bigint,
	"owner_team_id" bigint,
	"secondary_team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"goal_id" uuid,
	"objective_id" uuid,
	"kpi_id" uuid,
	"assigned_to_id" bigint,
	"assigned_by_id" bigint,
	"created_by_id" bigint,
	"planned_start_date" date,
	"due_date" date,
	"expected_hours" numeric(10,2),
	"week_start_date" date,
	"is_staff_added" boolean DEFAULT false NOT NULL,
	"requires_manager_ack" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_work_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"work_item_id" uuid NOT NULL,
	"staff_id" bigint NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"log_date" date NOT NULL,
	"hours_spent" numeric(10,2) DEFAULT '0' NOT NULL,
	"status" "work_item_status" DEFAULT 'in_progress'::"work_item_status" NOT NULL,
	"progress_percent" numeric(5,2),
	"note" text,
	"blocker_note" text,
	"carried_over" boolean DEFAULT false NOT NULL,
	"carry_over_to_date" date,
	"approval_status" "work_log_approval_status" DEFAULT 'draft'::"work_log_approval_status" NOT NULL,
	"approved_by_id" bigint,
	"approved_at" timestamp(6),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_acknowledgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" bigint NOT NULL,
	"subject_type" varchar(60) NOT NULL,
	"subject_id" varchar(191) NOT NULL,
	"subject_label" varchar(255),
	"version" varchar(60),
	"status" varchar(20) DEFAULT 'acknowledged' NOT NULL,
	"acknowledged_at" timestamp(6) DEFAULT now() NOT NULL,
	"revoked_at" timestamp(6),
	"source_form_submission_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_request_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL UNIQUE,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_request_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL UNIQUE,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_request_instances" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint,
	"request_type_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"organization_id" bigint,
	"created_by" bigint NOT NULL,
	"team_id" bigint,
	"workflow_instance_id" uuid,
	"status" "request_status" DEFAULT 'draft'::"request_status" NOT NULL,
	"data" jsonb,
	"current_approval_step" integer DEFAULT 0 NOT NULL,
	"audit_log_id" uuid,
	"total_amount" numeric(15,2),
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"contact_id" uuid,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" bigint NOT NULL,
	"file_id" uuid,
	"category_id" uuid,
	"subcategory_id" uuid,
	"description" text NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"due_date" date,
	"notes" text,
	"bank_name" varchar(120),
	"account_number" varchar(50),
	"account_name" varchar(120),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_request_item_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_item_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_request_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"category_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code_prefix" varchar(10) NOT NULL,
	"taxonomy_keys" jsonb,
	"description" text,
	"storage_type" varchar(20),
	"form_schema" jsonb,
	"approval_flow_json" jsonb,
	"approval_limit" numeric(15,2),
	"visible_to_roles" jsonb,
	"sequence_counter" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"workflow_type" varchar(20),
	"handler_role_label" varchar(100),
	"form_id" uuid,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(150) NOT NULL,
	"description" text,
	"entity_type" varchar(100) NOT NULL,
	"config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_workflow_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"instance_id" uuid NOT NULL,
	"transition_id" uuid,
	"from_step_id" uuid,
	"to_step_id" uuid,
	"action" varchar(50) NOT NULL,
	"performed_by" bigint,
	"comment" text,
	"data" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_workflow_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workflow_id" uuid NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(36) NOT NULL,
	"current_step_id" uuid,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"initiated_by" bigint,
	"completed_at" timestamp(6),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workflow_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"step_type" varchar(50) DEFAULT 'approval' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_initial" boolean DEFAULT false NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_workflow_step_approvers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"step_id" uuid NOT NULL,
	"approver_type" varchar(10) NOT NULL,
	"approver_id" varchar(64) NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"approval_order" integer DEFAULT 0 NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_workflow_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workflow_id" uuid NOT NULL,
	"from_step_id" uuid NOT NULL,
	"to_step_id" uuid NOT NULL,
	"name" text,
	"description" text,
	"action" varchar(50) NOT NULL,
	"conditions" jsonb,
	"config" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"name" varchar(150) NOT NULL,
	"code" varchar(60),
	"account_type" varchar(30) DEFAULT 'bank' NOT NULL,
	"bank_name" varchar(150),
	"account_name" varchar(150),
	"account_number" varchar(50),
	"branch_name" varchar(120),
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"opening_balance" numeric(15,2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"asset_id" varchar(50) NOT NULL UNIQUE,
	"organization_id" bigint,
	"team_id" bigint,
	"asset_description" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"serial_tag_no" varchar(120),
	"location_project" varchar(150),
	"assigned_to_user_id" bigint,
	"purchase_date" date NOT NULL,
	"supplier" varchar(150),
	"purchase_cost" numeric(15,2) NOT NULL,
	"useful_life_years" integer NOT NULL,
	"salvage_value" numeric(15,2) DEFAULT '0' NOT NULL,
	"condition" varchar(40) DEFAULT 'good' NOT NULL,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"last_verified_date" date,
	"last_verified_by" bigint,
	"notes" text,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_asset_disposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"asset_record_id" uuid NOT NULL UNIQUE,
	"disposal_date" date NOT NULL,
	"disposal_method" varchar(100) NOT NULL,
	"proceeds" numeric(15,2) DEFAULT '0' NOT NULL,
	"book_value_at_disposal" numeric(15,2) DEFAULT '0' NOT NULL,
	"gain_loss" numeric(15,2) DEFAULT '0' NOT NULL,
	"approved_by" bigint,
	"donor_asset" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_asset_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"asset_record_id" uuid NOT NULL,
	"verified_at" date NOT NULL,
	"condition" varchar(40) NOT NULL,
	"location_project" varchar(150),
	"assigned_to_user_id" bigint,
	"verified_by" bigint NOT NULL,
	"notes" text,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_bill_headers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"bill_number" varchar(60) NOT NULL UNIQUE,
	"contact_id" uuid NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"bill_date" date NOT NULL,
	"due_date" date,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"subtotal" numeric(15,2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"bill_id" uuid NOT NULL,
	"chart_account_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"quantity" numeric(15,2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15,2) NOT NULL,
	"line_total" numeric(15,2) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"parent_budget_id" uuid,
	"name" varchar(180) NOT NULL,
	"scope_type" varchar(30) DEFAULT 'project' NOT NULL,
	"budget_type" varchar(30) DEFAULT 'project' NOT NULL,
	"period_type" varchar(30) DEFAULT 'annual' NOT NULL,
	"fiscal_year" integer,
	"quarter" integer,
	"month" integer,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"exchange_rate" numeric(15,4),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"total_budget" numeric(15,2) DEFAULT '0' NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"approved_by" bigint,
	"approved_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL,
	"current_active_revision_id" uuid UNIQUE,
	"draft_revision_id" uuid UNIQUE,
	"owner_type" varchar(30),
	"owner_id" bigint,
	"prepared_by" bigint
);
--> statement-breakpoint
CREATE TABLE "sta_finance_budget_assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"budget_id" uuid NOT NULL,
	"section" varchar(60),
	"label" varchar(120) NOT NULL,
	"value" varchar(255) NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_budget_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"budget_id" uuid NOT NULL,
	"budget_revision_id" uuid NOT NULL,
	"budget_line_id" uuid,
	"request_id" bigint NOT NULL,
	"request_item_key" varchar(100),
	"status" varchar(30) DEFAULT 'reserved' NOT NULL,
	"committed_amount" numeric(15,2) NOT NULL,
	"actualized_amount" numeric(15,2),
	"notes" text,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"budget_id" uuid NOT NULL,
	"chart_account_id" uuid,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"section" varchar(20) DEFAULT 'expenditure' NOT NULL,
	"group_name" varchar(120),
	"line_label" varchar(180) NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"period_1_amount" numeric(15,2),
	"period_2_amount" numeric(15,2),
	"period_3_amount" numeric(15,2),
	"period_4_amount" numeric(15,2),
	"total_amount" numeric(15,2),
	"revised_total_amount" numeric(15,2),
	"actual_total_amount" numeric(15,2),
	"variance_amount" numeric(15,2),
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_budget_portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"budget_id" uuid NOT NULL,
	"project_id" bigint NOT NULL,
	"fund_id" uuid,
	"grant_id" uuid,
	"funder_name" varchar(180),
	"status" varchar(40),
	"period_1_amount" numeric(15,2),
	"period_2_amount" numeric(15,2),
	"period_3_amount" numeric(15,2),
	"period_4_amount" numeric(15,2),
	"period_total" numeric(15,2),
	"total_budget" numeric(15,2),
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_budget_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"budget_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"submission_note" text,
	"justification" text,
	"material_change_summary" text,
	"copied_from_revision_id" uuid,
	"submitted_by" bigint,
	"submitted_at" timestamp(6),
	"approved_by" bigint,
	"approved_at" timestamp(6),
	"workflow_instance_id" uuid,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_budget_revision_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"budget_revision_id" uuid NOT NULL,
	"chart_account_id" uuid,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"section" varchar(20) DEFAULT 'expenditure' NOT NULL,
	"group_name" varchar(120),
	"line_label" varchar(180) NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"period_1_amount" numeric(15,2),
	"period_2_amount" numeric(15,2),
	"period_3_amount" numeric(15,2),
	"period_4_amount" numeric(15,2),
	"total_amount" numeric(15,2),
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_chart_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" bigint,
	"finance_account_id" uuid UNIQUE,
	"code" varchar(40) NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(30) NOT NULL,
	"category" varchar(60) NOT NULL,
	"normal_balance" varchar(10) NOT NULL,
	"is_control_account" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" bigint,
	"contact_type" varchar(20) DEFAULT 'customer' NOT NULL,
	"sub_type" varchar(20) DEFAULT 'business' NOT NULL,
	"name" varchar(150) NOT NULL,
	"company_name" varchar(150),
	"legal_name" varchar(150),
	"email" varchar(255),
	"phone" varchar(40),
	"address" text,
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"tax_number" varchar(80),
	"is_taxable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"payment_terms" integer,
	"credit_limit" numeric(15,2),
	"opening_balance" numeric(15,2),
	"website" varchar(255),
	"notes" text,
	"metadata" jsonb,
	"primary_contact_id" uuid UNIQUE,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_contact_persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"contact_id" uuid NOT NULL,
	"salutation" varchar(10),
	"first_name" varchar(80),
	"last_name" varchar(80),
	"email" varchar(255),
	"phone" varchar(40),
	"mobile" varchar(40),
	"designation" varchar(80),
	"department" varchar(80),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_deduction_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"code" varchar(30) NOT NULL,
	"rate" numeric(6,4) NOT NULL,
	"applies_to" varchar(50) DEFAULT 'vendor' NOT NULL,
	"gl_account_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"organization_id" bigint,
	"created_by" bigint NOT NULL,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_donors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" bigint,
	"name" varchar(150) NOT NULL,
	"donor_type" varchar(40) DEFAULT 'grantor' NOT NULL,
	"email" varchar(255),
	"phone" varchar(40),
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"expense_number" varchar(60) NOT NULL UNIQUE,
	"contact_id" uuid,
	"account_id" uuid NOT NULL,
	"chart_account_id" uuid,
	"organization_id" bigint,
	"team_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"expense_date" date NOT NULL,
	"category" varchar(60),
	"description" text,
	"amount" numeric(15,2) NOT NULL,
	"currency" varchar(5) DEFAULT 'NGN' NOT NULL,
	"tax_amount" numeric(15,2),
	"total_amount" numeric(15,2),
	"reference" varchar(120),
	"receipt_file_id" uuid,
	"notes" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" bigint NOT NULL,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"project_id" bigint,
	"donor_id" uuid,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"fund_type" varchar(40) DEFAULT 'operating' NOT NULL,
	"restriction_type" varchar(40) DEFAULT 'unrestricted' NOT NULL,
	"purpose" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" bigint,
	"project_id" bigint,
	"donor_id" uuid,
	"fund_id" uuid,
	"code" varchar(60) NOT NULL,
	"name" varchar(180) NOT NULL,
	"restriction_type" varchar(40) DEFAULT 'restricted' NOT NULL,
	"start_date" date,
	"end_date" date,
	"committed_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"recognized_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"deferred_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"purpose" text,
	"notes" text,
	"metadata" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_income_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"revenue_account_id" uuid,
	"fund_id" uuid,
	"grant_id" uuid,
	"pledge_id" uuid,
	"receipt_number" varchar(60) UNIQUE,
	"amount" numeric(15,2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"received_at" timestamp(6) NOT NULL,
	"reference" varchar(120),
	"payer" varchar(150),
	"category_id" uuid,
	"notes" text,
	"file_id" uuid,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"code" varchar(60),
	"description" text,
	"item_type" varchar(30) DEFAULT 'service' NOT NULL,
	"unit" varchar(30),
	"unit_price" numeric(15,4) DEFAULT '0' NOT NULL,
	"cost_price" numeric(15,4),
	"currency" varchar(5) DEFAULT 'NGN' NOT NULL,
	"chart_account_id" uuid,
	"organization_id" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint NOT NULL,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"entry_no" varchar(60) NOT NULL,
	"entry_date" timestamp(6) NOT NULL,
	"period_id" uuid NOT NULL,
	"source_type" varchar(60),
	"source_id" varchar(120),
	"memo" varchar(255),
	"status" varchar(20) DEFAULT 'posted' NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"total_debit" numeric(15,2) DEFAULT '0' NOT NULL,
	"total_credit" numeric(15,2) DEFAULT '0' NOT NULL,
	"posted_by" bigint,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"journal_entry_id" uuid NOT NULL,
	"chart_account_id" uuid NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"description" varchar(255),
	"debit" numeric(15,2) DEFAULT '0' NOT NULL,
	"credit" numeric(15,2) DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_journal_sequences" (
	"id" varchar(32) PRIMARY KEY,
	"tenant_id" bigint,
	"prefix" varchar(10) NOT NULL,
	"sequence_year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"account_id" uuid NOT NULL,
	"direction" varchar(10) NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"entry_date" timestamp(6) NOT NULL,
	"description" varchar(255),
	"source_type" varchar(60),
	"source_id" varchar(120),
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_pv_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_voucher_id" uuid NOT NULL,
	"deduction_type_id" uuid NOT NULL,
	"request_deduction_id" uuid UNIQUE,
	"rate" numeric(6,4) NOT NULL,
	"gross_amount" numeric(15,2) NOT NULL,
	"deduction_amount" numeric(15,2) NOT NULL,
	"certificate_number" varchar(60),
	"created_by" bigint NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_payment_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" bigint NOT NULL,
	"paid_from_account_id" uuid,
	"expense_account_id" uuid,
	"fund_id" uuid,
	"grant_id" uuid,
	"voucher_number" varchar(60) NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"retired_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"retirement_status" varchar(20) DEFAULT 'not_retired' NOT NULL,
	"method" varchar(40),
	"transaction_ref" varchar(120),
	"note" text,
	"evidence_file_id" uuid,
	"disbursed_at" timestamp(6) NOT NULL,
	"retired_at" timestamp(6),
	"verified_at" timestamp(6),
	"metadata" jsonb,
	"contact_id" uuid,
	"gross_amount" numeric(15,2),
	"net_amount" numeric(15,2),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_payment_voucher_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"voucher_id" uuid NOT NULL,
	"request_id" bigint NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reason" text,
	"current_snapshot" jsonb NOT NULL,
	"proposed_snapshot" jsonb NOT NULL,
	"proposed_by" bigint NOT NULL,
	"reviewed_by" bigint,
	"reviewed_at" timestamp(6),
	"review_comment" text,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_payment_voucher_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"voucher_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"file_kind" varchar(30) DEFAULT 'evidence' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_payment_voucher_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_voucher_id" uuid NOT NULL,
	"request_item_id" uuid NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_pledges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pledge_number" varchar(60) NOT NULL,
	"organization_id" bigint,
	"donor_id" uuid NOT NULL,
	"grant_id" uuid,
	"fund_id" uuid,
	"amount" numeric(15,2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"received_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"pledged_at" timestamp(6) NOT NULL,
	"expected_at" timestamp(6),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"purpose" text,
	"notes" text,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"receipt_number" varchar(60) NOT NULL UNIQUE,
	"contact_id" uuid,
	"sales_invoice_id" uuid,
	"account_id" uuid NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"received_at" timestamp(6) NOT NULL,
	"reference" varchar(120),
	"notes" text,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_receipt_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"receipt_id" uuid NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_report_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"period_id" uuid NOT NULL,
	"report_key" varchar(80) NOT NULL,
	"kind" varchar(20) DEFAULT 'generated' NOT NULL,
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"title" varchar(150) NOT NULL,
	"body" text NOT NULL,
	"source_rule" varchar(120),
	"is_overridden" boolean DEFAULT false NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_reporting_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"quarter" integer NOT NULL,
	"label" varchar(40) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_request_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" bigint NOT NULL,
	"deduction_type_id" uuid NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"rate" numeric(6,4) NOT NULL,
	"gross_amount" numeric(15,2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_by" bigint NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_request_deduction_remittance_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_deduction_id" uuid NOT NULL,
	"request_remittance_id" uuid NOT NULL,
	"allocated_amount" numeric(15,2) NOT NULL,
	"created_by" bigint NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_request_remittances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"remittance_number" varchar(60) NOT NULL UNIQUE,
	"reference" varchar(255),
	"total_amount" numeric(15,2) NOT NULL,
	"remitted_at" timestamp(6),
	"payment_voucher_id" uuid,
	"remitted_by" bigint,
	"paid_from_account_id" uuid,
	"evidence_file_id" uuid,
	"evidence_file_ids" jsonb,
	"notes" text,
	"created_by" bigint NOT NULL,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"invoice_number" varchar(60) NOT NULL UNIQUE,
	"contact_id" uuid NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"invoice_date" date NOT NULL,
	"due_date" date,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp(6),
	"voided_at" timestamp(6),
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"subtotal" numeric(15,2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_sales_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"invoice_id" uuid NOT NULL,
	"chart_account_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"quantity" numeric(15,2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15,2) NOT NULL,
	"line_total" numeric(15,2) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" varchar(100) NOT NULL UNIQUE,
	"config" jsonb,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_vendor_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_number" varchar(60) NOT NULL UNIQUE,
	"contact_id" uuid,
	"bill_id" uuid,
	"account_id" uuid NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"paid_at" timestamp(6) NOT NULL,
	"reference" varchar(120),
	"notes" text,
	"metadata" jsonb,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_vendor_wht_accruals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"contact_id" uuid NOT NULL,
	"payment_voucher_id" uuid NOT NULL,
	"pv_deduction_id" uuid NOT NULL UNIQUE,
	"deduction_type_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"gross_amount" numeric(15,2) NOT NULL,
	"withheld_amount" numeric(15,2) NOT NULL,
	"remittance_id" uuid,
	"remitted_at" timestamp(6),
	"organization_id" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_finance_wht_remittances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"remittance_number" varchar(60) NOT NULL UNIQUE,
	"deduction_type_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"total_amount" numeric(15,2) NOT NULL,
	"paid_from_account_id" uuid NOT NULL,
	"remittance_date" date NOT NULL,
	"reference" varchar(120),
	"receipt_file_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"organization_id" bigint,
	"created_by" bigint NOT NULL,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_accounting_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_id" uuid NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"posted_by" bigint,
	"posted_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chart_account_id" uuid,
	"code" varchar(60) NOT NULL UNIQUE,
	"name" varchar(180) NOT NULL,
	"component_type" varchar(20) NOT NULL,
	"calculation_type" varchar(20) DEFAULT 'fixed' NOT NULL,
	"paid_by" varchar(20) DEFAULT 'employee' NOT NULL,
	"employer_share_percent" numeric(8,4) DEFAULT '0' NOT NULL,
	"is_taxable" boolean DEFAULT false NOT NULL,
	"affects_net_pay" boolean DEFAULT true NOT NULL,
	"is_statutory" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"retry_of_job_id" uuid,
	"uploaded_by" bigint,
	"retried_by" bigint,
	"file_name" varchar(255) NOT NULL,
	"status" varchar(30) DEFAULT 'processing' NOT NULL,
	"update_existing" boolean DEFAULT false NOT NULL,
	"summary" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"completed_at" timestamp(6),
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" uuid NOT NULL,
	"sheet_name" varchar(30) NOT NULL,
	"row_number" integer,
	"row_key" varchar(255),
	"action" varchar(20) DEFAULT 'create' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"payload" jsonb NOT NULL,
	"linked_run_id" uuid,
	"linked_run_item_id" uuid,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"worker_id" uuid NOT NULL,
	"component_id" uuid,
	"request_id" bigint,
	"loan_type" varchar(20) DEFAULT 'loan' NOT NULL,
	"title" varchar(180) NOT NULL,
	"principal_amount" numeric(15,2) NOT NULL,
	"outstanding_amount" numeric(15,2) NOT NULL,
	"issued_date" date NOT NULL,
	"start_recovery_date" date NOT NULL,
	"monthly_recovery_amount" numeric(15,2),
	"recovery_rate" numeric(8,4),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_loan_repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"loan_id" uuid NOT NULL,
	"run_id" uuid,
	"run_item_id" uuid,
	"amount" numeric(15,2) NOT NULL,
	"status" varchar(20) DEFAULT 'posted' NOT NULL,
	"notes" text,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" bigint NOT NULL UNIQUE,
	"config" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_payslip_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_id" uuid NOT NULL,
	"run_item_id" uuid,
	"worker_id" uuid,
	"recipient_email" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_by" bigint,
	"sent_at" timestamp(6),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"paid_from_account_id" uuid,
	"workflow_instance_id" uuid,
	"name" varchar(180) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"notes" text,
	"prepared_by" bigint,
	"reviewed_by" bigint,
	"approved_by" bigint,
	"authorized_at" timestamp(6),
	"authorized_by" bigint,
	"authorization_notes" text,
	"paid_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_id" uuid NOT NULL,
	"actor_id" bigint,
	"event_type" varchar(40) NOT NULL,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_run_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"worker_type" varchar(20) NOT NULL,
	"pay_basis" varchar(30) DEFAULT 'monthly_fixed' NOT NULL,
	"allocation_source" varchar(30) DEFAULT 'fixed' NOT NULL,
	"gross_pay" numeric(15,2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(15,2) DEFAULT '0' NOT NULL,
	"employer_cost_total" numeric(15,2) DEFAULT '0' NOT NULL,
	"computed_net_pay" numeric(15,2) DEFAULT '0' NOT NULL,
	"actual_net_pay" numeric(15,2) DEFAULT '0' NOT NULL,
	"net_adjustment_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"net_adjustment_reason" text,
	"net_pay" numeric(15,2) DEFAULT '0' NOT NULL,
	"payment_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"payment_reference" varchar(120),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_run_item_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_item_id" uuid NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"allocation_percent" numeric(8,4) DEFAULT '100' NOT NULL,
	"allocation_amount" numeric(15,2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_run_item_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_item_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"line_type" varchar(20) NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"quantity" numeric(10,2),
	"rate" numeric(10,4),
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_run_timesheet_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"hours" numeric(10,2) DEFAULT '0' NOT NULL,
	"allocation_percent" numeric(8,4) DEFAULT '0' NOT NULL,
	"source" varchar(20) DEFAULT 'manual' NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"approved_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" bigint,
	"default_expense_account_id" uuid,
	"default_cash_account_id" uuid,
	"employee_tax_table_id" uuid,
	"config" jsonb,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_tax_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"table_id" uuid NOT NULL,
	"lower_bound" numeric(15,2) DEFAULT '0' NOT NULL,
	"upper_bound" numeric(15,2),
	"rate" numeric(8,4) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_tax_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" bigint,
	"name" varchar(180) NOT NULL,
	"code" varchar(60) NOT NULL UNIQUE,
	"worker_type" varchar(20) DEFAULT 'employee' NOT NULL,
	"periodicity" varchar(20) DEFAULT 'monthly' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"fixed_relief_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"gross_relief_rate" numeric(8,4) DEFAULT '0' NOT NULL,
	"minimum_relief_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"pension_relief_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"profile_id" bigint,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"default_fund_id" uuid,
	"default_grant_id" uuid,
	"tax_table_id" uuid,
	"worker_type" varchar(20) DEFAULT 'employee' NOT NULL,
	"pay_basis" varchar(30) DEFAULT 'monthly_fixed' NOT NULL,
	"allocation_mode" varchar(20) DEFAULT 'fixed' NOT NULL,
	"hybrid_fixed_percent" numeric(8,4) DEFAULT '0' NOT NULL,
	"standard_hours_per_day" numeric(8,2) DEFAULT '8' NOT NULL,
	"full_name" varchar(180) NOT NULL,
	"email" varchar(255),
	"staff_code" varchar(60),
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"bank_name" varchar(150),
	"bank_account_name" varchar(180),
	"bank_account_number" varchar(60),
	"tax_identifier" varchar(120),
	"pension_identifier" varchar(120),
	"start_date" date,
	"end_date" date,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_worker_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"worker_id" uuid NOT NULL,
	"organization_id" bigint,
	"team_id" bigint,
	"project_id" bigint,
	"fund_id" uuid,
	"grant_id" uuid,
	"allocation_percent" numeric(8,4) DEFAULT '100' NOT NULL,
	"allocation_amount" numeric(15,2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_worker_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"worker_id" uuid NOT NULL,
	"pay_frequency" varchar(20) DEFAULT 'monthly' NOT NULL,
	"base_amount" numeric(15,2) DEFAULT '0' NOT NULL,
	"payment_mode" varchar(30),
	"effective_from" date NOT NULL,
	"effective_to" date,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_payroll_worker_profile_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"profile_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"amount" numeric(15,2),
	"rate" numeric(8,4),
	"formula" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" integer NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"reviewed_by" bigint,
	"reviewed_at" timestamp(6),
	"review_notes" text,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"code" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"annual_entitlement_days" integer DEFAULT 0 NOT NULL,
	"requires_approval" integer DEFAULT 1 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"title" varchar(255) NOT NULL,
	"slug" varchar(180) NOT NULL UNIQUE,
	"category" varchar(50) DEFAULT 'policy' NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"version" varchar(40) DEFAULT '1.0' NOT NULL,
	"effective_date" date,
	"content_html" text,
	"file_id" uuid,
	"link_url" varchar(2048),
	"require_acknowledgement" boolean DEFAULT false NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_document_acknowledgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"user_id" bigint NOT NULL,
	"version" varchar(40) NOT NULL,
	"acknowledged_at" timestamp(6) DEFAULT now() NOT NULL,
	"ip_address" varchar(64),
	"user_agent" varchar(512),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_file_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"organization_id" bigint,
	"uploaded_by" bigint,
	"storage_disk" varchar(30) DEFAULT 'local' NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(120),
	"file_size" bigint,
	"public_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"module" varchar(60) NOT NULL,
	"policy_key" varchar(120) NOT NULL,
	"scope_type" varchar(40) DEFAULT 'global' NOT NULL,
	"scope_id" varchar(191),
	"priority" integer DEFAULT 100 NOT NULL,
	"config_json" jsonb NOT NULL,
	"effective_from" timestamp(6),
	"effective_to" timestamp(6),
	"is_active" boolean DEFAULT true NOT NULL,
	"document_id" uuid,
	"document_version" varchar(40),
	"require_acknowledgement" boolean DEFAULT false NOT NULL,
	"created_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" varchar(100) NOT NULL UNIQUE,
	"name" varchar(120) NOT NULL,
	"description" text,
	"module" varchar(50),
	"render_type" varchar(20) DEFAULT 'select' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_taxonomy_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"taxonomy_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(80) NOT NULL,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_taxonomy_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"taxonomy_id" uuid NOT NULL,
	"value" varchar(120) NOT NULL,
	"label" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(150) NOT NULL,
	"description" text,
	"module" varchar(20) DEFAULT 'general' NOT NULL,
	"storage_type" varchar(20),
	"target_table" varchar(100),
	"column_mapping" jsonb,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_pattern" jsonb,
	"workflow_enabled" boolean DEFAULT false NOT NULL,
	"workflow_statuses" jsonb,
	"created_by_profile_id" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_form_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid NOT NULL,
	"assigned_to_role" varchar(100),
	"assigned_to_profile_id" bigint,
	"assigned_to_department_id" uuid,
	"visibility_roles" jsonb,
	"due_date" date,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"field_label" varchar(255) NOT NULL,
	"field_type" varchar(20) NOT NULL,
	"field_options" jsonb,
	"is_required" boolean DEFAULT false NOT NULL,
	"validation_rules" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid NOT NULL,
	"submission_number" varchar(50) NOT NULL,
	"submitted_by_profile_id" bigint NOT NULL,
	"organization_id" uuid,
	"status" varchar(50) DEFAULT 'submitted' NOT NULL,
	"assigned_to_profile_id" bigint,
	"resolved_at" timestamp(6),
	"resolution_notes" text,
	"submitted_at" timestamp(6) DEFAULT now() NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_form_submission_data" (
	"id" bigserial PRIMARY KEY,
	"submission_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"value_text" varchar(1000),
	"value_number" numeric(15,4),
	"value_date" date,
	"value_datetime" timestamp(6),
	"value_file_url" varchar(500),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_form_submission_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"action_type" varchar(20) NOT NULL,
	"performed_by_profile_id" bigint,
	"old_value" text,
	"new_value" text,
	"notes" text,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_procurement_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"case_id" uuid,
	"order_id" uuid,
	"file_id" uuid NOT NULL,
	"label" varchar(150),
	"visibility" varchar(20) DEFAULT 'internal' NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_procurement_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" bigint NOT NULL UNIQUE,
	"requisition_id" uuid UNIQUE,
	"assigned_officer_id" bigint,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"category" varchar(20),
	"note" text,
	"created_by" bigint,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_procurement_grns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"grn_number" varchar(30) NOT NULL UNIQUE,
	"po_id" uuid NOT NULL,
	"raised_by" bigint NOT NULL,
	"received_date" date NOT NULL,
	"items" jsonb NOT NULL,
	"overall_condition" varchar(20) DEFAULT 'satisfactory' NOT NULL,
	"notes" text,
	"confirmed_by_officer" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp(6),
	"confirmed_by" bigint,
	"status" "grn_status" DEFAULT 'pending'::"grn_status" NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_procurement_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"po_number" varchar(30) NOT NULL UNIQUE,
	"requisition_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"prepared_by" bigint NOT NULL,
	"organization_id" bigint,
	"items" jsonb NOT NULL,
	"total_amount" numeric(15,2) NOT NULL,
	"payment_pattern" "payment_pattern" DEFAULT 'post_delivery'::"payment_pattern" NOT NULL,
	"milestones" jsonb,
	"payment_terms" varchar(100),
	"delivery_date" date,
	"delivery_address" text,
	"workflow_instance_id" uuid,
	"status" "po_status" DEFAULT 'draft'::"po_status" NOT NULL,
	"vendor_acknowledged_at" timestamp(6),
	"vendor_acknowledge_note" text,
	"pdf_file_id" uuid,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_procurement_requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"requisition_number" varchar(30) NOT NULL UNIQUE,
	"organization_id" bigint,
	"team_id" bigint,
	"requested_by" bigint NOT NULL,
	"title" varchar(200) NOT NULL,
	"category" "procurement_category" NOT NULL,
	"payment_pattern" "payment_pattern" DEFAULT 'post_delivery'::"payment_pattern" NOT NULL,
	"items" jsonb NOT NULL,
	"estimated_total" numeric(15,2) NOT NULL,
	"justification" text,
	"budget_line_id" uuid,
	"workflow_instance_id" uuid,
	"status" "procurement_status" DEFAULT 'draft'::"procurement_status" NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_vendor_portal_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"vendor_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"hashed_password" text,
	"name" varchar(120) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_system_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"platform" varchar(50) NOT NULL,
	"module" varchar(50) NOT NULL,
	"version" varchar(50) NOT NULL,
	"min_version" varchar(50) NOT NULL,
	"force_update" boolean DEFAULT false NOT NULL,
	"release_notes" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_accounts" (
	"id" bigserial PRIMARY KEY,
	"profile_id" bigint NOT NULL,
	"provider" "mail_provider" NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp(6) NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"label" varchar(100),
	"last_synced_at" timestamp(6),
	"signature" text,
	"outlook_subscription_id" varchar(255),
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_headers" (
	"id" bigserial PRIMARY KEY,
	"account_id" bigint NOT NULL,
	"uid" varchar(255) NOT NULL,
	"folder" varchar(500) NOT NULL,
	"subject" varchar(998),
	"from_name" varchar(255),
	"from_email" varchar(255),
	"date" timestamp(6),
	"is_read" boolean DEFAULT false NOT NULL,
	"has_attachment" boolean DEFAULT false NOT NULL,
	"snippet" varchar(500),
	"synced_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"subscription_id" uuid,
	"plan_id" uuid NOT NULL,
	"number" varchar(40) NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"due_at" timestamp(6) NOT NULL,
	"paid_at" timestamp(6),
	"provider" varchar(30),
	"provider_reference" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_billing_payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"invoice_id" uuid NOT NULL,
	"provider" varchar(30) NOT NULL,
	"reference" varchar(255) NOT NULL,
	"status" varchar(30) DEFAULT 'initialized' NOT NULL,
	"authorization_url" varchar(1000),
	"paid_at" timestamp(6),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_billing_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider" varchar(30) NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(500),
	"features" jsonb DEFAULT '{}' NOT NULL,
	"limits" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_subscription_plan_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"provider" varchar(30) NOT NULL,
	"amount_minor" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"interval" varchar(20) DEFAULT 'monthly' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_tenant_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"starts_at" timestamp(6) DEFAULT now() NOT NULL,
	"ends_at" timestamp(6),
	"trial_ends_at" timestamp(6),
	"current_period_start" timestamp(6),
	"current_period_end" timestamp(6),
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"provider" varchar(30),
	"provider_subscription_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE "sta_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" bigint,
	"profile_id" bigint,
	"name" varchar(120) NOT NULL,
	"source" varchar(80) NOT NULL,
	"properties" jsonb,
	"occurred_at" timestamp(6) DEFAULT now() NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_tenants" (
	"id" bigserial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"plan" varchar(50) DEFAULT 'trial' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(6) DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_tenant_memberships" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"profile_id" bigint NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp(6) DEFAULT now() NOT NULL,
	"removed_at" timestamp(6),
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sta_tenant_organizations" (
	"id" bigserial PRIMARY KEY,
	"tenant_id" bigint NOT NULL,
	"organization_id" bigint NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "emailLog_index_tenantId" ON "sta_email_logs" ("tenant_id");--> statement-breakpoint
CREATE INDEX "emailLog_index_userId" ON "sta_email_logs" ("user_id");--> statement-breakpoint
CREATE INDEX "emailLog_index_status" ON "sta_email_logs" ("status");--> statement-breakpoint
CREATE INDEX "emailLog_index_notifiableType_notifiableId" ON "sta_email_logs" ("notifiable_type","notifiable_id");--> statement-breakpoint
CREATE INDEX "notification_index_tenantId" ON "sta_notifications" ("tenant_id");--> statement-breakpoint
CREATE INDEX "notification_index_userId" ON "sta_notifications" ("user_id");--> statement-breakpoint
CREATE INDEX "notification_index_type" ON "sta_notifications" ("type");--> statement-breakpoint
CREATE INDEX "notification_index_status" ON "sta_notifications" ("status");--> statement-breakpoint
CREATE INDEX "notification_index_notifiableType_notifiableId" ON "sta_notifications" ("notifiable_type","notifiable_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_token_hash_type" ON "sta_tokens" ("token_hash","type");--> statement-breakpoint
CREATE INDEX "token_index_profileId" ON "sta_tokens" ("profile_id");--> statement-breakpoint
CREATE INDEX "token_index_tokenHash" ON "sta_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "token_index_type" ON "sta_tokens" ("type");--> statement-breakpoint
CREATE INDEX "token_index_expiresAt" ON "sta_tokens" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_role_org_unique" ON "sta_user_roles" ("profile_id","role_id","organization_id");--> statement-breakpoint
CREATE INDEX "userRole_index_tenantId" ON "sta_user_roles" ("tenant_id");--> statement-breakpoint
CREATE INDEX "attendanceCorrection_index_userId_workDate" ON "sta_attendance_corrections" ("user_id","work_date");--> statement-breakpoint
CREATE INDEX "attendanceCorrection_index_status_requestedAt" ON "sta_attendance_corrections" ("status","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_attendance_daily" ON "sta_attendance_daily" ("user_id","work_date");--> statement-breakpoint
CREATE INDEX "attendanceDaily_index_status" ON "sta_attendance_daily" ("status");--> statement-breakpoint
CREATE INDEX "attendanceEntry_index_userId_workDate" ON "sta_attendance_entries" ("user_id","work_date");--> statement-breakpoint
CREATE INDEX "attendanceEntry_index_entryType_entryAt" ON "sta_attendance_entries" ("entry_type","entry_at");--> statement-breakpoint
CREATE INDEX "attendanceException_index_userId_workDate" ON "sta_attendance_exceptions" ("user_id","work_date");--> statement-breakpoint
CREATE INDEX "attendanceException_index_status_exceptionType" ON "sta_attendance_exceptions" ("status","exception_type");--> statement-breakpoint
CREATE INDEX "attendanceHoliday_index_tenantId" ON "sta_attendance_holidays" ("tenant_id");--> statement-breakpoint
CREATE INDEX "attendanceHoliday_index_organizationId_holidayDate" ON "sta_attendance_holidays" ("organization_id","holiday_date");--> statement-breakpoint
CREATE INDEX "attendanceHoliday_index_officeLocationId_holidayDate" ON "sta_attendance_holidays" ("office_location_id","holiday_date");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_meta_unique" ON "sta_employee_meta" ("user_id","meta_key");--> statement-breakpoint
CREATE INDEX "employeeMeta_index_metaKey" ON "sta_employee_meta" ("meta_key");--> statement-breakpoint
CREATE INDEX "employeeProfile_index_tenantId" ON "sta_employee_profiles" ("tenant_id");--> statement-breakpoint
CREATE INDEX "employeeProfile_index_managerUserId" ON "sta_employee_profiles" ("manager_user_id");--> statement-breakpoint
CREATE INDEX "employeeProfile_index_employmentStatus" ON "sta_employee_profiles" ("employment_status");--> statement-breakpoint
CREATE INDEX "leaveBalanceLedger_index_userId_leaveTypeKey_periodYear" ON "sta_leave_balance_ledger" ("user_id","leave_type_key","period_year");--> statement-breakpoint
CREATE INDEX "leaveBalanceLedger_index_entryType" ON "sta_leave_balance_ledger" ("entry_type");--> statement-breakpoint
CREATE INDEX "leaveBalanceLedger_index_sourceRequestId" ON "sta_leave_balance_ledger" ("source_request_id");--> statement-breakpoint
CREATE INDEX "onboardingProgress_index_status" ON "sta_onboarding_progress" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_organization" ON "sta_group_organizations" ("group_id","organization_id");--> statement-breakpoint
CREATE INDEX "groupOrganization_index_tenantId" ON "sta_group_organizations" ("tenant_id");--> statement-breakpoint
CREATE INDEX "groupOrganization_index_organizationId" ON "sta_group_organizations" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_user" ON "sta_group_users" ("group_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_user_organization_scope" ON "sta_group_user_organization_scopes" ("group_user_id","organization_id");--> statement-breakpoint
CREATE INDEX "groupUserOrganizationScope_index_tenantId" ON "sta_group_user_organization_scopes" ("tenant_id");--> statement-breakpoint
CREATE INDEX "groupUserOrganizationScope_index_organizationId" ON "sta_group_user_organization_scopes" ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_index_tenantId" ON "sta_organizations" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_office_location" ON "sta_organization_office_locations" ("organization_id","office_location_id");--> statement-breakpoint
CREATE INDEX "organizationOfficeLocation_index_officeLocationId" ON "sta_organization_office_locations" ("office_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_org_unique" ON "sta_profile_organizations" ("profile_id","organization_id");--> statement-breakpoint
CREATE INDEX "profileOrganization_index_tenantId" ON "sta_profile_organizations" ("tenant_id");--> statement-breakpoint
CREATE INDEX "project_index_tenantId" ON "sta_projects" ("tenant_id");--> statement-breakpoint
CREATE INDEX "project_index_organizationId" ON "sta_projects" ("organization_id");--> statement-breakpoint
CREATE INDEX "project_index_isActive" ON "sta_projects" ("is_active");--> statement-breakpoint
CREATE INDEX "projectGovernance_index_ownerUserId" ON "sta_project_governance" ("owner_user_id");--> statement-breakpoint
CREATE INDEX "projectGovernance_index_governanceStatus" ON "sta_project_governance" ("governance_status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_project_user" ON "sta_project_members" ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "projectMember_index_userId" ON "sta_project_members" ("user_id");--> statement-breakpoint
CREATE INDEX "projectMember_index_role" ON "sta_project_members" ("role");--> statement-breakpoint
CREATE INDEX "projectTimesheetEntry_index_workerId_workDate" ON "sta_project_timesheet_entries" ("worker_id","work_date");--> statement-breakpoint
CREATE INDEX "projectTimesheetEntry_index_projectId" ON "sta_project_timesheet_entries" ("project_id");--> statement-breakpoint
CREATE INDEX "projectTimesheetEntry_index_fundId" ON "sta_project_timesheet_entries" ("fund_id");--> statement-breakpoint
CREATE INDEX "projectTimesheetEntry_index_grantId" ON "sta_project_timesheet_entries" ("grant_id");--> statement-breakpoint
CREATE INDEX "projectTimesheetEntry_index_status" ON "sta_project_timesheet_entries" ("status");--> statement-breakpoint
CREATE INDEX "projectTimesheetEntry_index_syncedRunId" ON "sta_project_timesheet_entries" ("synced_run_id");--> statement-breakpoint
CREATE INDEX "projectTimesheetEntry_index_sourceWorkLogId" ON "sta_project_timesheet_entries" ("source_work_log_id");--> statement-breakpoint
CREATE INDEX "teamGoal_index_teamId_periodYear" ON "sta_team_goals" ("team_id","period_year");--> statement-breakpoint
CREATE INDEX "teamGoal_index_organizationId" ON "sta_team_goals" ("organization_id");--> statement-breakpoint
CREATE INDEX "teamKpi_index_goalId" ON "sta_team_kpis" ("goal_id");--> statement-breakpoint
CREATE INDEX "teamKpi_index_objectiveId" ON "sta_team_kpis" ("objective_id");--> statement-breakpoint
CREATE INDEX "teamKpi_index_teamId_periodYear_quarter" ON "sta_team_kpis" ("team_id","period_year","quarter");--> statement-breakpoint
CREATE INDEX "teamObjective_index_goalId" ON "sta_team_objectives" ("goal_id");--> statement-breakpoint
CREATE INDEX "teamObjective_index_teamId" ON "sta_team_objectives" ("team_id");--> statement-breakpoint
CREATE INDEX "workItem_index_assignedToId_status" ON "sta_work_items" ("assigned_to_id","status");--> statement-breakpoint
CREATE INDEX "workItem_index_ownerTeamId_weekStartDate" ON "sta_work_items" ("owner_team_id","week_start_date");--> statement-breakpoint
CREATE INDEX "workItem_index_projectId" ON "sta_work_items" ("project_id");--> statement-breakpoint
CREATE INDEX "workItem_index_fundId" ON "sta_work_items" ("fund_id");--> statement-breakpoint
CREATE INDEX "workItem_index_grantId" ON "sta_work_items" ("grant_id");--> statement-breakpoint
CREATE INDEX "workItem_index_goalId" ON "sta_work_items" ("goal_id");--> statement-breakpoint
CREATE INDEX "workItem_index_objectiveId" ON "sta_work_items" ("objective_id");--> statement-breakpoint
CREATE INDEX "workItem_index_kpiId" ON "sta_work_items" ("kpi_id");--> statement-breakpoint
CREATE INDEX "workLog_index_staffId_logDate" ON "sta_work_logs" ("staff_id","log_date");--> statement-breakpoint
CREATE INDEX "workLog_index_approvalStatus_logDate" ON "sta_work_logs" ("approval_status","log_date");--> statement-breakpoint
CREATE INDEX "workLog_index_projectId" ON "sta_work_logs" ("project_id");--> statement-breakpoint
CREATE INDEX "workLog_index_fundId" ON "sta_work_logs" ("fund_id");--> statement-breakpoint
CREATE INDEX "workLog_index_grantId" ON "sta_work_logs" ("grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_ack_subject_version" ON "sta_acknowledgements" ("user_id","subject_type","subject_id","version");--> statement-breakpoint
CREATE INDEX "acknowledgement_index_subjectType_subjectId" ON "sta_acknowledgements" ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "acknowledgement_index_status" ON "sta_acknowledgements" ("status");--> statement-breakpoint
CREATE INDEX "requestInstance_index_requestTypeId" ON "sta_request_instances" ("request_type_id");--> statement-breakpoint
CREATE INDEX "requestInstance_index_groupId" ON "sta_request_instances" ("group_id");--> statement-breakpoint
CREATE INDEX "requestInstance_index_createdBy" ON "sta_request_instances" ("created_by");--> statement-breakpoint
CREATE INDEX "requestInstance_index_teamId" ON "sta_request_instances" ("team_id");--> statement-breakpoint
CREATE INDEX "requestInstance_index_status" ON "sta_request_instances" ("status");--> statement-breakpoint
CREATE INDEX "requestInstance_index_workflowInstanceId" ON "sta_request_instances" ("workflow_instance_id");--> statement-breakpoint
CREATE INDEX "requestItem_index_requestId" ON "sta_request_items" ("request_id");--> statement-breakpoint
CREATE INDEX "requestItem_index_fileId" ON "sta_request_items" ("file_id");--> statement-breakpoint
CREATE INDEX "requestItem_index_categoryId" ON "sta_request_items" ("category_id");--> statement-breakpoint
CREATE INDEX "requestItem_index_subcategoryId" ON "sta_request_items" ("subcategory_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_request_item_file" ON "sta_request_item_files" ("request_item_id","file_id");--> statement-breakpoint
CREATE INDEX "requestItemFile_index_requestItemId_sortOrder" ON "sta_request_item_files" ("request_item_id","sort_order");--> statement-breakpoint
CREATE INDEX "requestItemFile_index_fileId" ON "sta_request_item_files" ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_category_code_prefix" ON "sta_request_types" ("category_id","code_prefix");--> statement-breakpoint
CREATE INDEX "workflow_index_entityType" ON "sta_workflows" ("entity_type");--> statement-breakpoint
CREATE INDEX "workflow_index_isActive" ON "sta_workflows" ("is_active");--> statement-breakpoint
CREATE INDEX "workflowHistory_index_instanceId" ON "sta_workflow_history" ("instance_id");--> statement-breakpoint
CREATE INDEX "workflowInstance_index_workflowId" ON "sta_workflow_instances" ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflowInstance_index_status" ON "sta_workflow_instances" ("status");--> statement-breakpoint
CREATE INDEX "workflowStep_index_workflowId" ON "sta_workflow_steps" ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflowStep_index_order" ON "sta_workflow_steps" ("order");--> statement-breakpoint
CREATE INDEX "workflowStepApprover_index_stepId" ON "sta_workflow_step_approvers" ("step_id");--> statement-breakpoint
CREATE INDEX "workflowTransition_index_workflowId" ON "sta_workflow_transitions" ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflowTransition_index_fromStepId" ON "sta_workflow_transitions" ("from_step_id");--> statement-breakpoint
CREATE INDEX "workflowTransition_index_toStepId" ON "sta_workflow_transitions" ("to_step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_account_name_per_org" ON "sta_finance_accounts" ("organization_id","name");--> statement-breakpoint
CREATE INDEX "financeAccount_index_tenantId" ON "sta_finance_accounts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeAccount_index_organizationId" ON "sta_finance_accounts" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeAccount_index_accountType" ON "sta_finance_accounts" ("account_type");--> statement-breakpoint
CREATE INDEX "financeAccount_index_isActive" ON "sta_finance_accounts" ("is_active");--> statement-breakpoint
CREATE INDEX "financeAsset_index_organizationId" ON "sta_finance_assets" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeAsset_index_teamId" ON "sta_finance_assets" ("team_id");--> statement-breakpoint
CREATE INDEX "financeAsset_index_assignedToUserId" ON "sta_finance_assets" ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "financeAsset_index_category" ON "sta_finance_assets" ("category");--> statement-breakpoint
CREATE INDEX "financeAsset_index_status" ON "sta_finance_assets" ("status");--> statement-breakpoint
CREATE INDEX "financeAsset_index_purchaseDate" ON "sta_finance_assets" ("purchase_date");--> statement-breakpoint
CREATE INDEX "financeAssetDisposal_index_disposalDate" ON "sta_finance_asset_disposals" ("disposal_date");--> statement-breakpoint
CREATE INDEX "financeAssetVerification_index_assetRecordId" ON "sta_finance_asset_verifications" ("asset_record_id");--> statement-breakpoint
CREATE INDEX "financeAssetVerification_index_verifiedAt" ON "sta_finance_asset_verifications" ("verified_at");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_contactId" ON "sta_finance_bill_headers" ("contact_id");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_organizationId" ON "sta_finance_bill_headers" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_teamId" ON "sta_finance_bill_headers" ("team_id");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_fundId" ON "sta_finance_bill_headers" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_grantId" ON "sta_finance_bill_headers" ("grant_id");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_status" ON "sta_finance_bill_headers" ("status");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_billDate" ON "sta_finance_bill_headers" ("bill_date");--> statement-breakpoint
CREATE INDEX "financeBillHeader_index_dueDate" ON "sta_finance_bill_headers" ("due_date");--> statement-breakpoint
CREATE INDEX "financeBillLine_index_billId" ON "sta_finance_bill_lines" ("bill_id");--> statement-breakpoint
CREATE INDEX "financeBillLine_index_chartAccountId" ON "sta_finance_bill_lines" ("chart_account_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_tenantId" ON "sta_finance_budgets" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_organizationId" ON "sta_finance_budgets" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_teamId" ON "sta_finance_budgets" ("team_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_projectId" ON "sta_finance_budgets" ("project_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_fundId" ON "sta_finance_budgets" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_grantId" ON "sta_finance_budgets" ("grant_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_parentBudgetId" ON "sta_finance_budgets" ("parent_budget_id");--> statement-breakpoint
CREATE INDEX "financeBudget_index_budgetType_status" ON "sta_finance_budgets" ("budget_type","status");--> statement-breakpoint
CREATE INDEX "financeBudget_index_scopeType_periodType" ON "sta_finance_budgets" ("scope_type","period_type");--> statement-breakpoint
CREATE INDEX "financeBudget_index_fiscalYear_quarter_month" ON "sta_finance_budgets" ("fiscal_year","quarter","month");--> statement-breakpoint
CREATE INDEX "financeBudget_index_startDate_endDate" ON "sta_finance_budgets" ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "financeBudgetAssumption_index_budgetId_sortOrder" ON "sta_finance_budget_assumptions" ("budget_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_request_budget_line_commitment" ON "sta_finance_budget_commitments" ("request_id","budget_line_id");--> statement-breakpoint
CREATE INDEX "financeBudgetCommitment_index_budgetId_status" ON "sta_finance_budget_commitments" ("budget_id","status");--> statement-breakpoint
CREATE INDEX "financeBudgetCommitment_index_requestId" ON "sta_finance_budget_commitments" ("request_id");--> statement-breakpoint
CREATE INDEX "financeBudgetLine_index_budgetId_sortOrder" ON "sta_finance_budget_lines" ("budget_id","sort_order");--> statement-breakpoint
CREATE INDEX "financeBudgetLine_index_chartAccountId" ON "sta_finance_budget_lines" ("chart_account_id");--> statement-breakpoint
CREATE INDEX "financeBudgetLine_index_projectId" ON "sta_finance_budget_lines" ("project_id");--> statement-breakpoint
CREATE INDEX "financeBudgetLine_index_fundId" ON "sta_finance_budget_lines" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeBudgetLine_index_grantId" ON "sta_finance_budget_lines" ("grant_id");--> statement-breakpoint
CREATE INDEX "financeBudgetLine_index_section" ON "sta_finance_budget_lines" ("section");--> statement-breakpoint
CREATE INDEX "financeBudgetPortfolio_index_budgetId_sortOrder" ON "sta_finance_budget_portfolio" ("budget_id","sort_order");--> statement-breakpoint
CREATE INDEX "financeBudgetPortfolio_index_projectId" ON "sta_finance_budget_portfolio" ("project_id");--> statement-breakpoint
CREATE INDEX "financeBudgetPortfolio_index_fundId" ON "sta_finance_budget_portfolio" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeBudgetPortfolio_index_grantId" ON "sta_finance_budget_portfolio" ("grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniqueIndex_budgetId_revisionNumber" ON "sta_finance_budget_revisions" ("budget_id","revision_number");--> statement-breakpoint
CREATE INDEX "financeBudgetRevision_index_budgetId_status" ON "sta_finance_budget_revisions" ("budget_id","status");--> statement-breakpoint
CREATE INDEX "financeBudgetRevisionLine_index_budgetRevisionId_sortOrder" ON "sta_finance_budget_revision_lines" ("budget_revision_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_chart_account_code_per_org" ON "sta_finance_chart_accounts" ("organization_id","code");--> statement-breakpoint
CREATE INDEX "financeChartAccount_index_type" ON "sta_finance_chart_accounts" ("type");--> statement-breakpoint
CREATE INDEX "financeChartAccount_index_category" ON "sta_finance_chart_accounts" ("category");--> statement-breakpoint
CREATE INDEX "financeChartAccount_index_isActive" ON "sta_finance_chart_accounts" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_contact_name_per_org" ON "sta_finance_contacts" ("organization_id","name");--> statement-breakpoint
CREATE INDEX "financeContact_index_contactType" ON "sta_finance_contacts" ("contact_type");--> statement-breakpoint
CREATE INDEX "financeContact_index_isActive" ON "sta_finance_contacts" ("is_active");--> statement-breakpoint
CREATE INDEX "financeContactPerson_index_contactId" ON "sta_finance_contact_persons" ("contact_id");--> statement-breakpoint
CREATE INDEX "financeDeductionType_index_isActive" ON "sta_finance_deduction_types" ("is_active");--> statement-breakpoint
CREATE INDEX "financeDonor_index_organizationId" ON "sta_finance_donors" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeDonor_index_isActive" ON "sta_finance_donors" ("is_active");--> statement-breakpoint
CREATE INDEX "financeExpense_index_status" ON "sta_finance_expenses" ("status");--> statement-breakpoint
CREATE INDEX "financeExpense_index_expenseDate" ON "sta_finance_expenses" ("expense_date");--> statement-breakpoint
CREATE INDEX "financeExpense_index_contactId" ON "sta_finance_expenses" ("contact_id");--> statement-breakpoint
CREATE INDEX "financeExpense_index_accountId" ON "sta_finance_expenses" ("account_id");--> statement-breakpoint
CREATE INDEX "financeExpense_index_tenantId" ON "sta_finance_expenses" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeExpense_index_organizationId" ON "sta_finance_expenses" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_fund_code_per_org" ON "sta_finance_funds" ("organization_id","code");--> statement-breakpoint
CREATE INDEX "financeFund_index_tenantId" ON "sta_finance_funds" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeFund_index_organizationId" ON "sta_finance_funds" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeFund_index_projectId" ON "sta_finance_funds" ("project_id");--> statement-breakpoint
CREATE INDEX "financeFund_index_restrictionType" ON "sta_finance_funds" ("restriction_type");--> statement-breakpoint
CREATE INDEX "financeFund_index_isActive" ON "sta_finance_funds" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_grant_code_per_org" ON "sta_finance_grants" ("organization_id","code");--> statement-breakpoint
CREATE INDEX "financeGrant_index_organizationId" ON "sta_finance_grants" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeGrant_index_projectId" ON "sta_finance_grants" ("project_id");--> statement-breakpoint
CREATE INDEX "financeGrant_index_donorId" ON "sta_finance_grants" ("donor_id");--> statement-breakpoint
CREATE INDEX "financeGrant_index_fundId" ON "sta_finance_grants" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeGrant_index_status" ON "sta_finance_grants" ("status");--> statement-breakpoint
CREATE INDEX "financeIncomeEntry_index_accountId" ON "sta_finance_income_entries" ("account_id");--> statement-breakpoint
CREATE INDEX "financeIncomeEntry_index_receivedAt" ON "sta_finance_income_entries" ("received_at");--> statement-breakpoint
CREATE INDEX "financeIncomeEntry_index_categoryId" ON "sta_finance_income_entries" ("category_id");--> statement-breakpoint
CREATE INDEX "financeIncomeEntry_index_revenueAccountId" ON "sta_finance_income_entries" ("revenue_account_id");--> statement-breakpoint
CREATE INDEX "financeIncomeEntry_index_fundId" ON "sta_finance_income_entries" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeIncomeEntry_index_grantId" ON "sta_finance_income_entries" ("grant_id");--> statement-breakpoint
CREATE INDEX "financeIncomeEntry_index_pledgeId" ON "sta_finance_income_entries" ("pledge_id");--> statement-breakpoint
CREATE INDEX "financeItem_index_itemType" ON "sta_finance_items" ("item_type");--> statement-breakpoint
CREATE INDEX "financeItem_index_isActive" ON "sta_finance_items" ("is_active");--> statement-breakpoint
CREATE INDEX "financeItem_index_organizationId" ON "sta_finance_items" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_journal_entry_no_per_tenant" ON "sta_finance_journal_entries" ("tenant_id","entry_no");--> statement-breakpoint
CREATE INDEX "financeJournalEntry_index_tenantId" ON "sta_finance_journal_entries" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeJournalEntry_index_periodId" ON "sta_finance_journal_entries" ("period_id");--> statement-breakpoint
CREATE INDEX "financeJournalEntry_index_entryDate" ON "sta_finance_journal_entries" ("entry_date");--> statement-breakpoint
CREATE INDEX "financeJournalEntry_index_sourceType_sourceId" ON "sta_finance_journal_entries" ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_tenantId" ON "sta_finance_journal_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_journalEntryId" ON "sta_finance_journal_lines" ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_chartAccountId" ON "sta_finance_journal_lines" ("chart_account_id");--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_organizationId" ON "sta_finance_journal_lines" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_teamId" ON "sta_finance_journal_lines" ("team_id");--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_fundId" ON "sta_finance_journal_lines" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeJournalLine_index_grantId" ON "sta_finance_journal_lines" ("grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_journal_sequence_prefix_year" ON "sta_finance_journal_sequences" ("tenant_id","prefix","sequence_year");--> statement-breakpoint
CREATE INDEX "financeJournalSequence_index_tenantId" ON "sta_finance_journal_sequences" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeLedgerEntry_index_tenantId" ON "sta_finance_ledger_entries" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeLedgerEntry_index_accountId" ON "sta_finance_ledger_entries" ("account_id");--> statement-breakpoint
CREATE INDEX "financeLedgerEntry_index_entryDate" ON "sta_finance_ledger_entries" ("entry_date");--> statement-breakpoint
CREATE INDEX "financeLedgerEntry_index_sourceType_sourceId" ON "sta_finance_ledger_entries" ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "financeLedgerEntry_index_direction" ON "sta_finance_ledger_entries" ("direction");--> statement-breakpoint
CREATE INDEX "financePVDeduction_index_paymentVoucherId" ON "sta_finance_pv_deductions" ("payment_voucher_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_requestId" ON "sta_finance_payment_vouchers" ("request_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_paidFromAccountId" ON "sta_finance_payment_vouchers" ("paid_from_account_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_expenseAccountId" ON "sta_finance_payment_vouchers" ("expense_account_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_fundId" ON "sta_finance_payment_vouchers" ("fund_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_grantId" ON "sta_finance_payment_vouchers" ("grant_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_voucherNumber" ON "sta_finance_payment_vouchers" ("voucher_number");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_retirementStatus" ON "sta_finance_payment_vouchers" ("retirement_status");--> statement-breakpoint
CREATE INDEX "financePaymentVoucher_index_contactId" ON "sta_finance_payment_vouchers" ("contact_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherCorrection_index_voucherId_status" ON "sta_finance_payment_voucher_corrections" ("voucher_id","status");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherCorrection_index_requestId_status" ON "sta_finance_payment_voucher_corrections" ("request_id","status");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherCorrection_index_proposedBy" ON "sta_finance_payment_voucher_corrections" ("proposed_by");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherCorrection_index_reviewedBy" ON "sta_finance_payment_voucher_corrections" ("reviewed_by");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_payment_voucher_file" ON "sta_finance_payment_voucher_files" ("voucher_id","file_id","file_kind");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherFile_index_voucherId_fileKind_sortOrder" ON "sta_finance_payment_voucher_files" ("voucher_id","file_kind","sort_order");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherFile_index_fileId" ON "sta_finance_payment_voucher_files" ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_voucher_item" ON "sta_finance_payment_voucher_items" ("payment_voucher_id","request_item_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherItem_index_paymentVoucherId" ON "sta_finance_payment_voucher_items" ("payment_voucher_id");--> statement-breakpoint
CREATE INDEX "financePaymentVoucherItem_index_requestItemId" ON "sta_finance_payment_voucher_items" ("request_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_pledge_number_per_org" ON "sta_finance_pledges" ("organization_id","pledge_number");--> statement-breakpoint
CREATE INDEX "financePledge_index_donorId" ON "sta_finance_pledges" ("donor_id");--> statement-breakpoint
CREATE INDEX "financePledge_index_grantId" ON "sta_finance_pledges" ("grant_id");--> statement-breakpoint
CREATE INDEX "financePledge_index_status" ON "sta_finance_pledges" ("status");--> statement-breakpoint
CREATE INDEX "financeReceipt_index_contactId" ON "sta_finance_receipts" ("contact_id");--> statement-breakpoint
CREATE INDEX "financeReceipt_index_accountId" ON "sta_finance_receipts" ("account_id");--> statement-breakpoint
CREATE INDEX "financeReceipt_index_receivedAt" ON "sta_finance_receipts" ("received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_receipt_invoice_allocation" ON "sta_finance_receipt_allocations" ("receipt_id","sales_invoice_id");--> statement-breakpoint
CREATE INDEX "financeReceiptAllocation_index_receiptId" ON "sta_finance_receipt_allocations" ("receipt_id");--> statement-breakpoint
CREATE INDEX "financeReceiptAllocation_index_salesInvoiceId" ON "sta_finance_receipt_allocations" ("sales_invoice_id");--> statement-breakpoint
CREATE INDEX "financeReportNote_index_periodId_reportKey" ON "sta_finance_report_notes" ("period_id","report_key");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_finance_reporting_period" ON "sta_finance_reporting_periods" ("tenant_id","year","month");--> statement-breakpoint
CREATE INDEX "financeReportingPeriod_index_tenantId" ON "sta_finance_reporting_periods" ("tenant_id");--> statement-breakpoint
CREATE INDEX "financeReportingPeriod_index_quarter" ON "sta_finance_reporting_periods" ("quarter");--> statement-breakpoint
CREATE INDEX "financeReportingPeriod_index_status" ON "sta_finance_reporting_periods" ("status");--> statement-breakpoint
CREATE INDEX "financeRequestDeduction_index_requestId" ON "sta_finance_request_deductions" ("request_id");--> statement-breakpoint
CREATE INDEX "financeRequestDeduction_index_status" ON "sta_finance_request_deductions" ("status");--> statement-breakpoint
CREATE INDEX "financeRequestDeduction_index_deductionTypeId" ON "sta_finance_request_deductions" ("deduction_type_id");--> statement-breakpoint
CREATE INDEX "financeRequestDeductionRemittanceAllocation_index_requestDeductionId" ON "sta_finance_request_deduction_remittance_allocations" ("request_deduction_id");--> statement-breakpoint
CREATE INDEX "financeRequestDeductionRemittanceAllocation_index_requestRemittanceId" ON "sta_finance_request_deduction_remittance_allocations" ("request_remittance_id");--> statement-breakpoint
CREATE INDEX "financeRequestRemittance_index_reference" ON "sta_finance_request_remittances" ("reference");--> statement-breakpoint
CREATE INDEX "financeRequestRemittance_index_paymentVoucherId" ON "sta_finance_request_remittances" ("payment_voucher_id");--> statement-breakpoint
CREATE INDEX "financeRequestRemittance_index_remittedBy" ON "sta_finance_request_remittances" ("remitted_by");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_contactId" ON "sta_finance_sales_invoices" ("contact_id");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_organizationId" ON "sta_finance_sales_invoices" ("organization_id");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_teamId" ON "sta_finance_sales_invoices" ("team_id");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_fundId" ON "sta_finance_sales_invoices" ("fund_id");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_grantId" ON "sta_finance_sales_invoices" ("grant_id");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_status" ON "sta_finance_sales_invoices" ("status");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_invoiceDate" ON "sta_finance_sales_invoices" ("invoice_date");--> statement-breakpoint
CREATE INDEX "financeSalesInvoice_index_dueDate" ON "sta_finance_sales_invoices" ("due_date");--> statement-breakpoint
CREATE INDEX "financeSalesInvoiceLine_index_invoiceId" ON "sta_finance_sales_invoice_lines" ("invoice_id");--> statement-breakpoint
CREATE INDEX "financeSalesInvoiceLine_index_chartAccountId" ON "sta_finance_sales_invoice_lines" ("chart_account_id");--> statement-breakpoint
CREATE INDEX "financeVendorPayment_index_contactId" ON "sta_finance_vendor_payments" ("contact_id");--> statement-breakpoint
CREATE INDEX "financeVendorPayment_index_billId" ON "sta_finance_vendor_payments" ("bill_id");--> statement-breakpoint
CREATE INDEX "financeVendorPayment_index_accountId" ON "sta_finance_vendor_payments" ("account_id");--> statement-breakpoint
CREATE INDEX "financeVendorPayment_index_paidAt" ON "sta_finance_vendor_payments" ("paid_at");--> statement-breakpoint
CREATE INDEX "financeVendorWHTAccrual_index_contactId" ON "sta_finance_vendor_wht_accruals" ("contact_id");--> statement-breakpoint
CREATE INDEX "financeVendorWHTAccrual_index_periodYear_periodMonth" ON "sta_finance_vendor_wht_accruals" ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "financeVendorWHTAccrual_index_remittanceId" ON "sta_finance_vendor_wht_accruals" ("remittance_id");--> statement-breakpoint
CREATE INDEX "financeWHTRemittance_index_periodYear_periodMonth" ON "sta_finance_wht_remittances" ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "financeWHTRemittance_index_deductionTypeId" ON "sta_finance_wht_remittances" ("deduction_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_payroll_posting" ON "sta_payroll_accounting_postings" ("run_id","journal_entry_id");--> statement-breakpoint
CREATE INDEX "payrollAccountingPosting_index_journalEntryId" ON "sta_payroll_accounting_postings" ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "payrollComponent_index_chartAccountId" ON "sta_payroll_components" ("chart_account_id");--> statement-breakpoint
CREATE INDEX "payrollComponent_index_componentType_isActive" ON "sta_payroll_components" ("component_type","is_active");--> statement-breakpoint
CREATE INDEX "payrollImportJob_index_status_createdAt" ON "sta_payroll_import_jobs" ("status","created_at");--> statement-breakpoint
CREATE INDEX "payrollImportJob_index_uploadedBy" ON "sta_payroll_import_jobs" ("uploaded_by");--> statement-breakpoint
CREATE INDEX "payrollImportJob_index_retryOfJobId" ON "sta_payroll_import_jobs" ("retry_of_job_id");--> statement-breakpoint
CREATE INDEX "payrollImportRow_index_jobId_sheetName" ON "sta_payroll_import_rows" ("job_id","sheet_name");--> statement-breakpoint
CREATE INDEX "payrollImportRow_index_status" ON "sta_payroll_import_rows" ("status");--> statement-breakpoint
CREATE INDEX "payrollImportRow_index_linkedRunId" ON "sta_payroll_import_rows" ("linked_run_id");--> statement-breakpoint
CREATE INDEX "payrollImportRow_index_linkedRunItemId" ON "sta_payroll_import_rows" ("linked_run_item_id");--> statement-breakpoint
CREATE INDEX "payrollLoan_index_workerId_status" ON "sta_payroll_loans" ("worker_id","status");--> statement-breakpoint
CREATE INDEX "payrollLoan_index_componentId" ON "sta_payroll_loans" ("component_id");--> statement-breakpoint
CREATE INDEX "payrollLoan_index_requestId" ON "sta_payroll_loans" ("request_id");--> statement-breakpoint
CREATE INDEX "payrollLoanRepayment_index_loanId" ON "sta_payroll_loan_repayments" ("loan_id");--> statement-breakpoint
CREATE INDEX "payrollLoanRepayment_index_runId" ON "sta_payroll_loan_repayments" ("run_id");--> statement-breakpoint
CREATE INDEX "payrollLoanRepayment_index_runItemId" ON "sta_payroll_loan_repayments" ("run_item_id");--> statement-breakpoint
CREATE INDEX "payrollNotificationPreference_index_userId" ON "sta_payroll_notification_preferences" ("user_id");--> statement-breakpoint
CREATE INDEX "payrollPayslipDistribution_index_runId_createdAt" ON "sta_payroll_payslip_distributions" ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "payrollPayslipDistribution_index_runItemId" ON "sta_payroll_payslip_distributions" ("run_item_id");--> statement-breakpoint
CREATE INDEX "payrollPayslipDistribution_index_workerId" ON "sta_payroll_payslip_distributions" ("worker_id");--> statement-breakpoint
CREATE INDEX "payrollPayslipDistribution_index_status" ON "sta_payroll_payslip_distributions" ("status");--> statement-breakpoint
CREATE INDEX "payrollPayslipDistribution_index_sentBy" ON "sta_payroll_payslip_distributions" ("sent_by");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_payroll_run_period" ON "sta_payroll_runs" ("organization_id","year","month");--> statement-breakpoint
CREATE INDEX "payrollRun_index_status" ON "sta_payroll_runs" ("status");--> statement-breakpoint
CREATE INDEX "payrollRun_index_workflowInstanceId" ON "sta_payroll_runs" ("workflow_instance_id");--> statement-breakpoint
CREATE INDEX "payrollRun_index_paidFromAccountId" ON "sta_payroll_runs" ("paid_from_account_id");--> statement-breakpoint
CREATE INDEX "payrollRun_index_tenantId" ON "sta_payroll_runs" ("tenant_id");--> statement-breakpoint
CREATE INDEX "payrollRun_index_organizationId" ON "sta_payroll_runs" ("organization_id");--> statement-breakpoint
CREATE INDEX "payrollRunEvent_index_runId_createdAt" ON "sta_payroll_run_events" ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "payrollRunEvent_index_eventType" ON "sta_payroll_run_events" ("event_type");--> statement-breakpoint
CREATE INDEX "payrollRunEvent_index_actorId" ON "sta_payroll_run_events" ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_payroll_run_worker" ON "sta_payroll_run_items" ("run_id","worker_id");--> statement-breakpoint
CREATE INDEX "payrollRunItem_index_runId_paymentStatus" ON "sta_payroll_run_items" ("run_id","payment_status");--> statement-breakpoint
CREATE INDEX "payrollRunItem_index_organizationId" ON "sta_payroll_run_items" ("organization_id");--> statement-breakpoint
CREATE INDEX "payrollRunItem_index_teamId" ON "sta_payroll_run_items" ("team_id");--> statement-breakpoint
CREATE INDEX "payrollRunItem_index_projectId" ON "sta_payroll_run_items" ("project_id");--> statement-breakpoint
CREATE INDEX "payrollRunItem_index_fundId" ON "sta_payroll_run_items" ("fund_id");--> statement-breakpoint
CREATE INDEX "payrollRunItem_index_grantId" ON "sta_payroll_run_items" ("grant_id");--> statement-breakpoint
CREATE INDEX "payrollRunItemAllocation_index_runItemId_sortOrder" ON "sta_payroll_run_item_allocations" ("run_item_id","sort_order");--> statement-breakpoint
CREATE INDEX "payrollRunItemAllocation_index_organizationId" ON "sta_payroll_run_item_allocations" ("organization_id");--> statement-breakpoint
CREATE INDEX "payrollRunItemAllocation_index_teamId" ON "sta_payroll_run_item_allocations" ("team_id");--> statement-breakpoint
CREATE INDEX "payrollRunItemAllocation_index_projectId" ON "sta_payroll_run_item_allocations" ("project_id");--> statement-breakpoint
CREATE INDEX "payrollRunItemAllocation_index_fundId" ON "sta_payroll_run_item_allocations" ("fund_id");--> statement-breakpoint
CREATE INDEX "payrollRunItemAllocation_index_grantId" ON "sta_payroll_run_item_allocations" ("grant_id");--> statement-breakpoint
CREATE INDEX "payrollRunItemLine_index_runItemId" ON "sta_payroll_run_item_lines" ("run_item_id");--> statement-breakpoint
CREATE INDEX "payrollRunItemLine_index_componentId" ON "sta_payroll_run_item_lines" ("component_id");--> statement-breakpoint
CREATE INDEX "payrollRunTimesheetAllocation_index_runId_workerId_sortOrder" ON "sta_payroll_run_timesheet_allocations" ("run_id","worker_id","sort_order");--> statement-breakpoint
CREATE INDEX "payrollRunTimesheetAllocation_index_organizationId" ON "sta_payroll_run_timesheet_allocations" ("organization_id");--> statement-breakpoint
CREATE INDEX "payrollRunTimesheetAllocation_index_teamId" ON "sta_payroll_run_timesheet_allocations" ("team_id");--> statement-breakpoint
CREATE INDEX "payrollRunTimesheetAllocation_index_projectId" ON "sta_payroll_run_timesheet_allocations" ("project_id");--> statement-breakpoint
CREATE INDEX "payrollRunTimesheetAllocation_index_fundId" ON "sta_payroll_run_timesheet_allocations" ("fund_id");--> statement-breakpoint
CREATE INDEX "payrollRunTimesheetAllocation_index_grantId" ON "sta_payroll_run_timesheet_allocations" ("grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_payroll_setting_org" ON "sta_payroll_settings" ("organization_id");--> statement-breakpoint
CREATE INDEX "payrollSetting_index_defaultExpenseAccountId" ON "sta_payroll_settings" ("default_expense_account_id");--> statement-breakpoint
CREATE INDEX "payrollSetting_index_defaultCashAccountId" ON "sta_payroll_settings" ("default_cash_account_id");--> statement-breakpoint
CREATE INDEX "payrollSetting_index_employeeTaxTableId" ON "sta_payroll_settings" ("employee_tax_table_id");--> statement-breakpoint
CREATE INDEX "payrollTaxBand_index_tableId_sortOrder" ON "sta_payroll_tax_bands" ("table_id","sort_order");--> statement-breakpoint
CREATE INDEX "payrollTaxTable_index_organizationId_workerType_status" ON "sta_payroll_tax_tables" ("organization_id","worker_type","status");--> statement-breakpoint
CREATE INDEX "payrollTaxTable_index_effectiveFrom_effectiveTo" ON "sta_payroll_tax_tables" ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_profileId" ON "sta_payroll_workers" ("profile_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_tenantId" ON "sta_payroll_workers" ("tenant_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_organizationId" ON "sta_payroll_workers" ("organization_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_teamId" ON "sta_payroll_workers" ("team_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_projectId" ON "sta_payroll_workers" ("project_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_defaultFundId" ON "sta_payroll_workers" ("default_fund_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_defaultGrantId" ON "sta_payroll_workers" ("default_grant_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_taxTableId" ON "sta_payroll_workers" ("tax_table_id");--> statement-breakpoint
CREATE INDEX "payrollWorker_index_workerType_status" ON "sta_payroll_workers" ("worker_type","status");--> statement-breakpoint
CREATE INDEX "payrollWorkerAllocation_index_workerId_sortOrder" ON "sta_payroll_worker_allocations" ("worker_id","sort_order");--> statement-breakpoint
CREATE INDEX "payrollWorkerAllocation_index_organizationId" ON "sta_payroll_worker_allocations" ("organization_id");--> statement-breakpoint
CREATE INDEX "payrollWorkerAllocation_index_teamId" ON "sta_payroll_worker_allocations" ("team_id");--> statement-breakpoint
CREATE INDEX "payrollWorkerAllocation_index_projectId" ON "sta_payroll_worker_allocations" ("project_id");--> statement-breakpoint
CREATE INDEX "payrollWorkerAllocation_index_fundId" ON "sta_payroll_worker_allocations" ("fund_id");--> statement-breakpoint
CREATE INDEX "payrollWorkerAllocation_index_grantId" ON "sta_payroll_worker_allocations" ("grant_id");--> statement-breakpoint
CREATE INDEX "payrollWorkerProfile_index_workerId_effectiveFrom_effectiveTo" ON "sta_payroll_worker_profiles" ("worker_id","effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_payroll_profile_component" ON "sta_payroll_worker_profile_components" ("profile_id","component_id");--> statement-breakpoint
CREATE INDEX "payrollWorkerProfileComponent_index_componentId" ON "sta_payroll_worker_profile_components" ("component_id");--> statement-breakpoint
CREATE INDEX "leave_request_tenant_status_idx" ON "sta_leave_requests" ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "leave_request_user_dates_idx" ON "sta_leave_requests" ("user_id","start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_type_tenant_code_unique" ON "sta_leave_types" ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "leave_type_tenant_idx" ON "sta_leave_types" ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_index_tenantId" ON "sta_documents" ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_index_organizationId" ON "sta_documents" ("organization_id");--> statement-breakpoint
CREATE INDEX "document_index_status" ON "sta_documents" ("status");--> statement-breakpoint
CREATE INDEX "document_index_category" ON "sta_documents" ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_document_ack" ON "sta_document_acknowledgements" ("document_id","user_id","version");--> statement-breakpoint
CREATE INDEX "documentAcknowledgement_index_userId" ON "sta_document_acknowledgements" ("user_id");--> statement-breakpoint
CREATE INDEX "fileAsset_index_tenantId" ON "sta_file_assets" ("tenant_id");--> statement-breakpoint
CREATE INDEX "fileAsset_index_organizationId" ON "sta_file_assets" ("organization_id");--> statement-breakpoint
CREATE INDEX "fileAsset_index_uploadedBy" ON "sta_file_assets" ("uploaded_by");--> statement-breakpoint
CREATE INDEX "policy_index_module_policyKey_isActive" ON "sta_policies" ("module","policy_key","is_active");--> statement-breakpoint
CREATE INDEX "policy_index_scopeType_scopeId" ON "sta_policies" ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "policy_index_effectiveFrom_effectiveTo" ON "sta_policies" ("effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_taxonomy_entity_tag" ON "sta_taxonomy_tag_assignments" ("taxonomy_id","term_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "taxonomyTagAssignment_idx_taggable_entity" ON "sta_taxonomy_tag_assignments" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "taxonomyTagAssignment_idx_taggable_taxonomy_term" ON "sta_taxonomy_tag_assignments" ("taxonomy_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_taxonomy_term_value" ON "sta_taxonomy_terms" ("taxonomy_id","value");--> statement-breakpoint
CREATE INDEX "taxonomyTerm_index_taxonomyId_isActive" ON "sta_taxonomy_terms" ("taxonomy_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_form_field_key" ON "sta_form_fields" ("form_id","field_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uniqueIndex_submissionNumber" ON "sta_form_submissions" ("submission_number");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_submission_field" ON "sta_form_submission_data" ("submission_id","field_id");--> statement-breakpoint
CREATE INDEX "procurementAttachment_index_caseId" ON "sta_procurement_attachments" ("case_id");--> statement-breakpoint
CREATE INDEX "procurementAttachment_index_orderId" ON "sta_procurement_attachments" ("order_id");--> statement-breakpoint
CREATE INDEX "procurementAttachment_index_fileId" ON "sta_procurement_attachments" ("file_id");--> statement-breakpoint
CREATE INDEX "procurementAttachment_index_visibility" ON "sta_procurement_attachments" ("visibility");--> statement-breakpoint
CREATE INDEX "procurementCase_index_status" ON "sta_procurement_cases" ("status");--> statement-breakpoint
CREATE INDEX "procurementCase_index_assignedOfficerId" ON "sta_procurement_cases" ("assigned_officer_id");--> statement-breakpoint
CREATE INDEX "procurementGRN_index_poId" ON "sta_procurement_grns" ("po_id");--> statement-breakpoint
CREATE INDEX "procurementGRN_index_status" ON "sta_procurement_grns" ("status");--> statement-breakpoint
CREATE INDEX "procurementOrder_index_requisitionId" ON "sta_procurement_orders" ("requisition_id");--> statement-breakpoint
CREATE INDEX "procurementOrder_index_vendorId" ON "sta_procurement_orders" ("vendor_id");--> statement-breakpoint
CREATE INDEX "procurementOrder_index_tenantId" ON "sta_procurement_orders" ("tenant_id");--> statement-breakpoint
CREATE INDEX "procurementOrder_index_status" ON "sta_procurement_orders" ("status");--> statement-breakpoint
CREATE INDEX "procurementRequisition_index_requestedBy" ON "sta_procurement_requisitions" ("requested_by");--> statement-breakpoint
CREATE INDEX "procurementRequisition_index_status" ON "sta_procurement_requisitions" ("status");--> statement-breakpoint
CREATE INDEX "procurementRequisition_index_tenantId" ON "sta_procurement_requisitions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "procurementRequisition_index_organizationId" ON "sta_procurement_requisitions" ("organization_id");--> statement-breakpoint
CREATE INDEX "vendorPortalUser_index_vendorId" ON "sta_vendor_portal_users" ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniqueIndex_platform_module" ON "sta_system_versions" ("platform","module");--> statement-breakpoint
CREATE INDEX "mailAccount_index_profileId" ON "mail_accounts" ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniqueIndex_accountId_folder_uid" ON "mail_headers" ("account_id","folder","uid");--> statement-breakpoint
CREATE INDEX "mailHeader_index_accountId_folder" ON "mail_headers" ("account_id","folder");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_invoice_unique_number" ON "sta_billing_invoices" ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_invoice_unique_provider_reference" ON "sta_billing_invoices" ("provider","provider_reference");--> statement-breakpoint
CREATE INDEX "billing_invoice_tenant_idx" ON "sta_billing_invoices" ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_invoice_tenant_status_idx" ON "sta_billing_invoices" ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_attempt_unique_reference" ON "sta_billing_payment_attempts" ("provider","reference");--> statement-breakpoint
CREATE INDEX "billing_attempt_tenant_idx" ON "sta_billing_payment_attempts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_attempt_invoice_idx" ON "sta_billing_payment_attempts" ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_unique_event" ON "sta_billing_webhook_events" ("provider","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plan_unique_code" ON "sta_subscription_plans" ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plan_price_unique" ON "sta_subscription_plan_prices" ("plan_id","provider","currency","interval");--> statement-breakpoint
CREATE INDEX "subscription_plan_price_plan_idx" ON "sta_subscription_plan_prices" ("plan_id");--> statement-breakpoint
CREATE INDEX "tenant_subscription_tenant_status_idx" ON "sta_tenant_subscriptions" ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_subscription_provider_unique" ON "sta_tenant_subscriptions" ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "notification_job_status_run_idx" ON "sta_notification_jobs" ("status","run_at");--> statement-breakpoint
CREATE INDEX "notification_job_tenant_idx" ON "sta_notification_jobs" ("tenant_id");--> statement-breakpoint
CREATE INDEX "analytics_event_tenant_name_idx" ON "sta_analytics_events" ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "analytics_event_occurred_idx" ON "sta_analytics_events" ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_unique_slug" ON "sta_tenants" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_membership_unique_profile" ON "sta_tenant_memberships" ("tenant_id","profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_organization_unique" ON "sta_tenant_organizations" ("tenant_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_organization_org_unique" ON "sta_tenant_organizations" ("organization_id");