import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, SQL, sql } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContext } from '$common/auth/tenant-context';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { UsersService } from '$modules/identity/users/users.service';
import { InviteUserDto } from '$modules/identity/users/dto/invite-user.dto';
import { profile } from '$modules/identity/users/model';
import { role, userRole } from '$modules/identity/rbac/model';
import { tenant, tenantMembership } from './model';
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
  'sta_workflow_instances',
  'sta_workflow_history',
  'sta_form_assignments',
  'sta_form_submissions',
  'sta_form_submission_data',
  'sta_form_submission_history',
  'sta_acknowledgements',
  'sta_taxonomy_tag_assignments',
  'sta_crm_accounts',
  'sta_crm_contacts',
  'sta_crm_leads',
  'sta_crm_pipelines',
  'sta_crm_pipeline_stages',
  'sta_crm_opportunities',
  'sta_crm_activities',
  'sta_chat_conversations',
  'sta_chat_conversation_members',
  'sta_chat_messages',
  'sta_chat_message_attachments',
  'sta_storage_folders',
  'sta_background_jobs',
] as const;

@Injectable()
export class TenancyService {
  constructor(
    private readonly db: DbService,
    private readonly usersService: UsersService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private requireOwner(context: TenantContext) {
    if (!context.isOwner) throw new BadRequestException('Only tenant owners can change tenant settings');
  }

  async auditTenantCoverage(context: TenantContext) {
    const results = await Promise.all(
      TENANT_SCOPED_TABLES.map(async (table) => {
        const rows = await this.queryRaw<{ total: number; unscoped: number }>(
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
    const memberships = await this.db.client
      .select()
      .from(tenantMembership)
      .where(and(eq(tenantMembership.tenantId, context.tenantId), eq(tenantMembership.status, 'active')))
      .orderBy(asc(tenantMembership.joinedAt));

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const [memberProfile] = await this.db.client
          .select({ id: profile.id, email: profile.email, firstName: profile.firstName, lastName: profile.lastName, status: profile.status })
          .from(profile)
          .where(eq(profile.id, membership.profileId))
          .limit(1);
        if (!memberProfile) return null;
        const roles = await this.db.client
          .select({ role })
          .from(userRole)
          .innerJoin(role, eq(userRole.roleId, role.id))
          .where(and(eq(userRole.profileId, memberProfile.id), eq(userRole.tenantId, context.tenantId)));
        return {
          membershipId: membership.id.toString(),
          profileId: memberProfile.id.toString(),
          email: memberProfile.email,
          firstName: memberProfile.firstName,
          lastName: memberProfile.lastName,
          profileStatus: memberProfile.status,
          isOwner: membership.isOwner,
          joinedAt: membership.joinedAt,
          roles: roles.map((assignment) => assignment.role.slug),
        };
      }),
    );
    return members.filter((member): member is NonNullable<typeof member> => member !== null);
  }

  async getTenant(context: TenantContext) {
    const tenantRecord = await this.findTenant(context.tenantId);
    if (!tenantRecord) throw new NotFoundException('Tenant not found');
    return {
      id: tenantRecord.id.toString(),
      name: tenantRecord.name,
      slug: tenantRecord.slug,
      status: tenantRecord.status,
      plan: tenantRecord.plan,
      metadata: tenantRecord.metadata,
      createdAt: tenantRecord.createdAt,
      updatedAt: tenantRecord.updatedAt,
    };
  }

  async updateTenant(context: TenantContext, dto: UpdateTenantDto) {
    this.requireOwner(context);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.plan !== undefined) data.plan = dto.plan.trim();
    if (dto.metadata !== undefined) data.metadata = dto.metadata;
    if (Object.keys(data).length === 0) throw new BadRequestException('At least one tenant field is required');

    const [tenantRecord] = await this.db.client
      .update(tenant)
      .set(data)
      .where(eq(tenant.id, context.tenantId))
      .returning();
    return {
      id: tenantRecord.id.toString(),
      name: tenantRecord.name,
      slug: tenantRecord.slug,
      status: tenantRecord.status,
      plan: tenantRecord.plan,
      metadata: tenantRecord.metadata,
      updatedAt: tenantRecord.updatedAt,
    };
  }

  async setTenantStatus(context: TenantContext, status: 'active' | 'suspended') {
    this.requireOwner(context);
    const [tenantRecord] = await this.db.client
      .update(tenant)
      .set({ status })
      .where(eq(tenant.id, context.tenantId))
      .returning();
    return { id: tenantRecord.id.toString(), status: tenantRecord.status };
  }

  async deactivateMember(context: TenantContext, profileId: bigint) {
    const membership = await this.findActiveMembership(context.tenantId, profileId);
    if (!membership) throw new NotFoundException('Tenant membership not found');
    if (membership.isOwner) throw new BadRequestException('Tenant owners cannot be deactivated');
    if (membership.profileId === context.profileId) {
      throw new BadRequestException('You cannot deactivate your own tenant membership');
    }

    await this.db.client.update(tenantMembership)
      .set({ status: 'inactive', removedAt: new Date() })
      .where(eq(tenantMembership.id, membership.id));
    return { success: true };
  }

  async inviteMember(context: TenantContext, emailValue: string, message?: string) {
    const email = emailValue.trim().toLowerCase();
    let invitee = await this.tenantContext.runSystem('tenancy.inviteMember', () =>
      this.findProfileByEmail(email),
    );
    if (!invitee) {
      const [created] = await this.db.client
        .insert(profile)
        .values({ email, type: 'staff', status: 'invited' })
        .returning({ id: profile.id, status: profile.status });
      invitee = { id: created.id, status: created.status };
    }

    const existing = await this.findMembership(context.tenantId, invitee.id);
    if (existing?.status === 'active') throw new BadRequestException('User is already a tenant member');

    if (existing) {
      await this.db.client.update(tenantMembership)
        .set({ status: 'active', removedAt: null })
        .where(eq(tenantMembership.id, existing.id));
    } else {
      await this.db.client.insert(tenantMembership).values({
          tenantId: context.tenantId,
          profileId: invitee.id,
          status: 'active',
          isOwner: false,
      });
    }

    await this.usersService.inviteUser(invitee.id.toString(), {
      message,
    } as InviteUserDto, context.tenantId);

    return { success: true, profileId: invitee.id.toString() };
  }

  async assignRoles(context: TenantContext, profileId: bigint, roleSlugs: string[]) {
    const membership = await this.findActiveMembership(context.tenantId, profileId);
    if (!membership) throw new NotFoundException('Tenant membership not found');

    const normalized = Array.from(new Set(roleSlugs.map((role) => role.trim()).filter(Boolean)));
    const roles = await this.db.client
      .select({ id: role.id, slug: role.slug })
      .from(role)
      .where(and(inArray(role.slug, normalized), eq(role.isActive, true)));
    if (roles.length !== normalized.length) {
      const found = new Set(roles.map((role) => role.slug));
      throw new BadRequestException(`Unknown role(s): ${normalized.filter((role) => !found.has(role)).join(', ')}`);
    }

    await this.db.client.transaction(async (tx) => {
      await tx.delete(userRole).where(and(eq(userRole.profileId, profileId), eq(userRole.tenantId, context.tenantId)));
      if (roles.length > 0) {
        await tx.insert(userRole).values(roles.map((role, index) => ({
          profileId,
          roleId: role.id,
          tenantId: context.tenantId,
          isPrimaryRole: index === 0,
        }))).onConflictDoNothing();
      }
    });

    return { success: true, profileId: profileId.toString(), roles: roles.map((role) => role.slug) };
  }

  async transferOwnership(context: TenantContext, targetProfileId: bigint) {
    this.requireOwner(context);
    if (targetProfileId === context.profileId) {
      throw new BadRequestException('You are already the tenant owner');
    }

    const current = await this.findActiveMembership(context.tenantId, context.profileId);
    if (!current || !current.isOwner) {
      throw new BadRequestException('You are not an active tenant owner');
    }

    const target = await this.findActiveMembership(context.tenantId, targetProfileId);
    if (!target) throw new NotFoundException('Target user is not an active tenant member');
    if (target.isOwner) throw new BadRequestException('Target user is already the tenant owner');

    await this.db.client.transaction(async (tx) => {
      await tx.update(tenantMembership).set({ isOwner: false }).where(eq(tenantMembership.id, current.id));
      await tx.update(tenantMembership).set({ isOwner: true }).where(eq(tenantMembership.id, target.id));
    });

    return { success: true, ownerProfileId: targetProfileId.toString() };
  }

  async exportTenantData(context: TenantContext) {
    this.requireOwner(context);

    const tables = await this.queryRaw<{ tableName: string }>(
      sql`SELECT table_name AS "tableName"
          FROM information_schema.columns
          WHERE table_schema = 'public' AND column_name = 'tenant_id'
          ORDER BY table_name ASC`,
    );

    const exported: Record<string, unknown[]> = {};
    for (const { tableName } of tables) {
      const rows = await this.queryRaw<Record<string, unknown>>(
        sql`SELECT * FROM ${sql.raw(`"${tableName}"`)} WHERE tenant_id = ${context.tenantId}`,
      );
      exported[tableName] = rows;
    }

    exported['sta_profiles'] = await this.queryRaw<Record<string, unknown>>(
      sql`SELECT p.* FROM sta_profiles p
          JOIN sta_tenant_memberships m ON m.profile_id = p.id
          WHERE m.tenant_id = ${context.tenantId}`,
    );
    exported['sta_tenants'] = await this.queryRaw<Record<string, unknown>>(
      sql`SELECT * FROM sta_tenants WHERE id = ${context.tenantId}`,
    );

    return {
      exportedAt: new Date().toISOString(),
      tenantId: context.tenantId.toString(),
      tables: exported,
    };
  }

  async decommissionTenant(context: TenantContext, confirm: boolean) {
    this.requireOwner(context);
    if (confirm !== true) {
      throw new BadRequestException('Tenant decommissioning requires explicit confirmation');
    }

    await this.db.client.delete(tenant).where(eq(tenant.id, context.tenantId));
    return { success: true };
  }

  private async findTenant(id: bigint) {
    const [tenantRecord] = await this.db.client.select().from(tenant).where(eq(tenant.id, id)).limit(1);
    return tenantRecord ?? null;
  }

  private async findProfileByEmail(email: string) {
    const [user] = await this.db.client
      .select({ id: profile.id, status: profile.status })
      .from(profile)
      .where(eq(profile.email, email))
      .limit(1);
    return user ?? null;
  }

  private async findMembership(tenantId: bigint, profileId: bigint) {
    const [membership] = await this.db.client
      .select()
      .from(tenantMembership)
      .where(and(eq(tenantMembership.tenantId, tenantId), eq(tenantMembership.profileId, profileId)))
      .limit(1);
    return membership ?? null;
  }

  private async findActiveMembership(tenantId: bigint, profileId: bigint) {
    const [membership] = await this.db.client
      .select()
      .from(tenantMembership)
      .where(and(
        eq(tenantMembership.tenantId, tenantId),
        eq(tenantMembership.profileId, profileId),
        eq(tenantMembership.status, 'active'),
      ))
      .limit(1);
    return membership ?? null;
  }

  private async queryRaw<T>(statement: SQL): Promise<T[]> {
    const result = await this.db.client.execute(statement) as { rows?: T[] } | T[];
    return Array.isArray(result) ? result : result.rows ?? [];
  }
}
