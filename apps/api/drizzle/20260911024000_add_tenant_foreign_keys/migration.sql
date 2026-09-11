ALTER TABLE "sta_tenant_memberships"
  ADD CONSTRAINT "tenant_membership_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "sta_tenant_organizations"
  ADD CONSTRAINT "tenant_organization_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "sta_tenant_organizations"
  ADD CONSTRAINT "tenant_organization_organization_fk"
  FOREIGN KEY ("organization_id") REFERENCES "sta_organizations" ("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "sta_organizations"
  ADD CONSTRAINT "organization_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_profile_organizations"
  ADD CONSTRAINT "profile_organization_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_user_roles"
  ADD CONSTRAINT "user_role_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_tokens"
  ADD CONSTRAINT "token_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "sta_projects"
  ADD CONSTRAINT "project_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_request_groups"
  ADD CONSTRAINT "request_group_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_request_instances"
  ADD CONSTRAINT "request_instance_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_file_assets"
  ADD CONSTRAINT "file_asset_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_documents"
  ADD CONSTRAINT "document_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "sta_payroll_workers"
  ADD CONSTRAINT "payroll_worker_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_payroll_runs"
  ADD CONSTRAINT "payroll_run_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_procurement_requisitions"
  ADD CONSTRAINT "procurement_requisition_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_procurement_orders"
  ADD CONSTRAINT "procurement_order_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_accounts"
  ADD CONSTRAINT "finance_account_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_funds"
  ADD CONSTRAINT "finance_fund_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_budgets"
  ADD CONSTRAINT "finance_budget_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_finance_expenses"
  ADD CONSTRAINT "finance_expense_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "sta_groups"
  ADD CONSTRAINT "group_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_employee_profiles"
  ADD CONSTRAINT "employee_profile_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_attendance_holidays"
  ADD CONSTRAINT "attendance_holiday_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_organization_office_locations"
  ADD CONSTRAINT "organization_office_location_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_group_organizations"
  ADD CONSTRAINT "group_organization_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "sta_group_user_organization_scopes"
  ADD CONSTRAINT "group_user_organization_scope_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE SET NULL;
