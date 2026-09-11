import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContext } from '$common/auth/tenant-context';

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

  async listMembers(context: TenantContext) {
    const memberships = await this.drizzle.tenantMembership.findMany({
      where: { tenantId: context.tenantId, status: 'active' },
      orderBy: { joinedAt: 'asc' },
    });

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const profile = await this.drizzle.profile.findUnique({
          where: { id: membership.profileId },
          select: { id: true, email: true, firstName: true, lastName: true, status: true },
        });
        if (!profile) return null;
        return {
          membershipId: membership.id.toString(),
          profileId: profile.id.toString(),
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profileStatus: profile.status,
          isOwner: membership.isOwner,
          joinedAt: membership.joinedAt,
        };
      }),
    );
    return members.filter((member): member is NonNullable<typeof member> => member !== null);
  }

  async deactivateMember(context: TenantContext, profileId: bigint) {
    const membership = await this.drizzle.tenantMembership.findFirst({
      where: { tenantId: context.tenantId, profileId, status: 'active' },
    });
    if (!membership) throw new NotFoundException('Tenant membership not found');
    if (membership.isOwner) throw new BadRequestException('Tenant owners cannot be deactivated');
    if (membership.profileId === context.profileId) {
      throw new BadRequestException('You cannot deactivate your own tenant membership');
    }

    await this.drizzle.tenantMembership.update({
      where: { id: membership.id },
      data: { status: 'inactive', removedAt: new Date() },
    });
    return { success: true };
  }
}
