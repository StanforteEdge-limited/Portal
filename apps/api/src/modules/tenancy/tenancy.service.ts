import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '$common/drizzle/drizzle.service';

const TENANT_SCOPED_TABLES = [
  'sta_organizations',
  'sta_profile_organizations',
  'sta_user_roles',
  'sta_tokens',
  'sta_projects',
  'sta_request_groups',
  'sta_request_instances',
  'sta_file_assets',
  'sta_documents',
  'sta_payroll_workers',
  'sta_payroll_runs',
  'sta_procurement_requisitions',
  'sta_procurement_orders',
  'sta_finance_accounts',
  'sta_finance_funds',
  'sta_finance_budgets',
  'sta_finance_expenses',
  'sta_groups',
  'sta_employee_profiles',
  'sta_attendance_holidays',
  'sta_organization_office_locations',
  'sta_group_organizations',
  'sta_group_user_organization_scopes',
] as const;

@Injectable()
export class TenancyService {
  constructor(private readonly drizzle: DrizzleService) {}

  async auditTenantCoverage() {
    const results = await Promise.all(
      TENANT_SCOPED_TABLES.map(async (table) => {
        const rows = await this.drizzle.$queryRaw<{ total: number; unscoped: number }>(
          sql.raw(
            `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE tenant_id IS NULL)::int AS unscoped FROM "${table}"`,
          ),
        );
        const row = rows[0] ?? { total: 0, unscoped: 0 };
        return {
          table,
          total: Number(row.total),
          unscoped: Number(row.unscoped),
          complete: Number(row.unscoped) === 0,
        };
      }),
    );
    return {
      complete: results.every((result) => result.complete),
      tables: results,
    };
  }
}
