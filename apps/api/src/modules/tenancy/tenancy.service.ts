import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContext } from '$common/auth/tenant-context';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { UsersService } from '$modules/identity/users/users.service';
import { InviteUserDto } from '$modules/identity/users/dto/invite-user.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const TENANT_SCOPED_TABLES = [
  'sta_tenant_memberships',
  'sta_tenant_organizations',
  'sta_organizations',
  'sta_profile_organizations',
  'sta_user_roles',
  'sta_tokens',
  'sta_notifications',
  'sta_email_logs',
  'sta_notification_jobs',
  'sta_analytics_events',
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
  'sta_finance_reporting_periods',
  'sta_finance_journal_entries',
  'sta_finance_journal_sequences',
  'sta_finance_journal_lines',
  'sta_finance_ledger_entries',
  'sta_tenant_subscriptions',
  'sta_billing_invoices',
  'sta_billing_payment_attempts',
  'sta_groups',
  'sta_employee_profiles',
  'sta_attendance_holidays',
  'sta_organization_office_locations',
  'sta_group_organizations',
  'sta_group_user_organization_scopes',
] as const;

@Injectable()
export class TenancyService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly usersService: UsersService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private requireOwner(context: TenantContext) {
    if (!context.isOwner) throw new BadRequestException('Only tenant owners can change tenant settings');
  }

  async auditTenantCoverage(context: TenantContext) {
    const results = await Promise.all(
      TENANT_SCOPED_TABLES.map(async (table) => {
        const rows = await this.drizzle.$queryRaw<{ total: number; unscoped: number }>(
          sql`SELECT COUNT(*) FILTER (WHERE tenant_id = ${context.tenantId})::int AS total,
                     COUNT(*) FILTER (WHERE tenant_id IS NULL)::int AS unscoped
              FROM ${sql.raw(`"${table}"`)}`,
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
        const roles = await this.drizzle.userRole.findMany({
          where: { profileId: profile.id, tenantId: context.tenantId },
          include: { role: true },
        });
        return {
          membershipId: membership.id.toString(),
          profileId: profile.id.toString(),
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profileStatus: profile.status,
          isOwner: membership.isOwner,
          joinedAt: membership.joinedAt,
          roles: roles.map((assignment) => assignment.role.slug),
        };
      }),
    );
    return members.filter((member): member is NonNullable<typeof member> => member !== null);
  }

  async getTenant(context: TenantContext) {
    const tenant = await this.drizzle.tenant.findUnique({ where: { id: context.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return {
      id: tenant.id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      metadata: tenant.metadata,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async updateTenant(context: TenantContext, dto: UpdateTenantDto) {
    this.requireOwner(context);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.plan !== undefined) data.plan = dto.plan.trim();
    if (dto.metadata !== undefined) data.metadata = dto.metadata;
    if (Object.keys(data).length === 0) throw new BadRequestException('At least one tenant field is required');

    const tenant = await this.drizzle.tenant.update({
      where: { id: context.tenantId },
      data,
    });
    return {
      id: tenant.id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      metadata: tenant.metadata,
      updatedAt: tenant.updatedAt,
    };
  }

  async setTenantStatus(context: TenantContext, status: 'active' | 'suspended') {
    this.requireOwner(context);
    const tenant = await this.drizzle.tenant.update({
      where: { id: context.tenantId },
      data: { status },
    });
    return { id: tenant.id.toString(), status: tenant.status };
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

  async inviteMember(context: TenantContext, emailValue: string, message?: string) {
    const email = emailValue.trim().toLowerCase();
    const profile = await this.tenantContext.runSystem('tenancy.inviteMember', () =>
      this.drizzle.profile.findUnique({
        where: { email },
        select: { id: true, status: true },
      }),
    );
    if (!profile) throw new NotFoundException('User account not found; create the user account before inviting it');

    const existing = await this.drizzle.tenantMembership.findFirst({
      where: { tenantId: context.tenantId, profileId: profile.id },
    });
    if (existing?.status === 'active') throw new BadRequestException('User is already a tenant member');

    if (existing) {
      await this.drizzle.tenantMembership.update({
        where: { id: existing.id },
        data: { status: 'active', removedAt: null },
      });
    } else {
      await this.drizzle.tenantMembership.create({
        data: {
          tenantId: context.tenantId,
          profileId: profile.id,
          status: 'active',
          isOwner: false,
        },
      });
    }

    await this.usersService.inviteUser(profile.id.toString(), {
      message,
    } as InviteUserDto, context.tenantId);

    return { success: true, profileId: profile.id.toString() };
  }

  async assignRoles(context: TenantContext, profileId: bigint, roleSlugs: string[]) {
    const membership = await this.drizzle.tenantMembership.findFirst({
      where: { tenantId: context.tenantId, profileId, status: 'active' },
    });
    if (!membership) throw new NotFoundException('Tenant membership not found');

    const normalized = Array.from(new Set(roleSlugs.map((role) => role.trim()).filter(Boolean)));
    const roles = await this.drizzle.role.findMany({
      where: { slug: { in: normalized }, isActive: true },
      select: { id: true, slug: true },
    });
    if (roles.length !== normalized.length) {
      const found = new Set(roles.map((role) => role.slug));
      throw new BadRequestException(`Unknown role(s): ${normalized.filter((role) => !found.has(role)).join(', ')}`);
    }

    await this.drizzle.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { profileId, tenantId: context.tenantId } });
      await tx.userRole.createMany({
        data: roles.map((role, index) => ({
          profileId,
          roleId: role.id,
          tenantId: context.tenantId,
          isPrimaryRole: index === 0,
        })),
        skipDuplicates: true,
      });
    });

    return { success: true, profileId: profileId.toString(), roles: roles.map((role) => role.slug) };
  }
}
