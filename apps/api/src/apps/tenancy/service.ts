import {
  CreateWorkspace,
  UpdateTenant,
} from '@stanforte/contract';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { generateUniqueUsername, makeUsernameSeed } from '$core/utils/username';
import { form, formField } from '$apps/hr/forms/model';
import { policy } from '$apps/hr/policies/model';
import { taxonomy, taxonomyTerm } from '$apps/hr/taxonomy/model';
import { workflow, workflowStep, workflowStepApprover, workflowTransition } from '$apps/hr/workflow/model';

import { BadRequestException, Injectable, NotFoundException } from '$core/nest-compat';
import { and, asc, eq, inArray, SQL, sql, count, isNull } from 'drizzle-orm';
import { AppDb, DbService } from '$core/db';
import { TenantContext } from '$core/auth/tenant-context';
import { TenantContextService } from '$core/auth/tenant-context.service';
import { UsersService } from '$apps/identity/users/service';

import { profile } from '$apps/identity/users/model';
import { role, userRole } from '$apps/identity/rbac/model';
import { tenant, tenantMembership } from './model';


const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'system', 'platform', 'stanforteedge',
  'stanforte-edge', 'demo', 'test', 'tenant', 'workspace', 'api', 'beta', 'www',
]);

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

  async updateTenant(context: TenantContext, dto: UpdateTenant) {
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

    await this.usersService.inviteUser(invitee.id.toString(), { message }, context.tenantId);

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

async createWorkspace(dto: CreateWorkspace) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const slug = this.normalizeWorkspaceSlug(dto.slug ?? name);
    if (RESERVED_SLUGS.has(slug)) throw new BadRequestException('Workspace slug is reserved');

    await this.tenantContext.runSystem('workspace.createWorkspace.validate', async () => {
      const [existingTenant, existingProfile] = await Promise.all([
        this.findTenantBySlug(slug),
        this.findWorkspaceProfileByEmail(email),
      ]);
      if (existingTenant) throw new BadRequestException('Workspace slug is already taken');
      if (existingProfile) {
        throw new BadRequestException('A user with this email already exists; sign in and join a workspace instead');
      }
    });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const username = await generateUniqueUsername(
      makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]), async (candidate) =>
        await this.tenantContext.runSystem('workspace.createWorkspace.username', () =>
          this.findProfileByUsername(candidate).then(Boolean),
        ),
    );

    return this.tenantContext.runSystem('workspace.createWorkspace', () =>
      this.db.client.transaction(async (tx) => {
        const [tenantRecord] = await tx.insert(tenant)
          .values({ name, slug, plan: dto.plan?.trim() || 'trial' })
          .returning();

        const defaults = await this.cloneTemplates(tx, tenantRecord.id);

        const [owner] = await tx.insert(profile)
          .values({
            username,
            email,
            passwordHash,
            type: 'admin',
            status: 'active',
            firstName: dto.first_name,
            lastName: dto.last_name,
          })
          .returning();

        await tx.insert(tenantMembership)
          .values({ tenantId: tenantRecord.id, profileId: owner.id, status: 'active', isOwner: true });

        const adminRoles = await tx
          .select({ id: role.id })
          .from(role)
          .where(and(eq(role.isActive, true), inArray(role.slug, ['administrator', 'admin']), isNull(role.tenantId)));

        if (adminRoles.length > 0) {
          await tx.insert(userRole).values(
            adminRoles.map((roleRecord) => ({
              profileId: owner.id,
              roleId: roleRecord.id,
              tenantId: tenantRecord.id,
              organizationId: null,
              isPrimaryRole: true,
            })),
          ).onConflictDoNothing();
        }

        return {
          tenant_id: tenantRecord.id.toString(),
          name: tenantRecord.name,
          slug: tenantRecord.slug,
          plan: tenantRecord.plan,
          owner_id: owner.id.toString(),
          email: owner.email,
          role: adminRoles.length > 0 ? 'administrator' : 'owner',
          defaults,
        };
      }),
    );
  }

  async bootstrapDefaults(context: TenantContext) {
    if (!context.isOwner) throw new BadRequestException('Only tenant owners can bootstrap workspace defaults');

    return this.tenantContext.runSystem('workspace.bootstrapDefaults', () =>
      this.db.client.transaction(
        async (tx) => ({ success: true, ...(await this.cloneTemplates(tx, context.tenantId)) }),
      ),
    );
  }

  private async cloneTemplates(tx: Parameters<Parameters<AppDb['transaction']>[0]>[0], tenantId: bigint) {
    const outcome = {
      workflows: { cloned: 0, skipped: false },
      forms: { cloned: 0, skipped: false },
      policies: { cloned: 0, skipped: false },
      taxonomies: { cloned: 0, skipped: false },
    };

    if ((await this.countRows(tx, workflow, eq(workflow.tenantId, tenantId))) === 0) {
      const workflows = await tx.select().from(workflow).where(isNull(workflow.tenantId));
      const workflowId = new Map<string, string>();
      for (const w of workflows) workflowId.set(w.id, randomUUID());
      if (workflows.length > 0) {
        await tx.insert(workflow).values(workflows.map((w) => ({
            id: workflowId.get(w.id) as string,
            tenantId,
            name: w.name,
            description: w.description,
            entityType: w.entityType,
            config: w.config,
            isActive: w.isActive,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
          })));

        const steps = await tx.select().from(workflowStep).where(isNull(workflowStep.tenantId));
        const stepId = new Map<string, string>();
        for (const s of steps) stepId.set(s.id, randomUUID());
        if (steps.length > 0) {
          await tx.insert(workflowStep).values(steps.map((s) => ({
              id: stepId.get(s.id) as string,
              tenantId,
              workflowId: workflowId.get(s.workflowId) as string,
              name: s.name,
              description: s.description,
              stepType: s.stepType,
              order: s.order,
              isInitial: s.isInitial,
              isFinal: s.isFinal,
              config: s.config,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
            })));

          const approvers = await tx.select().from(workflowStepApprover).where(isNull(workflowStepApprover.tenantId));
          if (approvers.length > 0) {
            await tx.insert(workflowStepApprover).values(approvers.map((a) => ({
                tenantId,
                stepId: stepId.get(a.stepId) as string,
                approverType: a.approverType,
                approverId: a.approverId,
                isRequired: a.isRequired,
                approvalOrder: a.approvalOrder,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
              })));
          }

          const transitions = await tx.select().from(workflowTransition).where(isNull(workflowTransition.tenantId));
          if (transitions.length > 0) {
            await tx.insert(workflowTransition).values(transitions.map((t) => ({
                tenantId,
                workflowId: workflowId.get(t.workflowId) as string,
                fromStepId: stepId.get(t.fromStepId) as string,
                toStepId: stepId.get(t.toStepId) as string,
                name: t.name,
                description: t.description,
                action: t.action,
                conditions: t.conditions,
                config: t.config,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
              })));
          }
        }
      }
      outcome.workflows = { cloned: workflows.length, skipped: false };
    } else {
      outcome.workflows = { cloned: 0, skipped: true };
    }

    if ((await this.countRows(tx, form, eq(form.tenantId, tenantId))) === 0) {
      const forms = await tx.select().from(form).where(isNull(form.tenantId));
      const formId = new Map<string, string>();
      for (const f of forms) formId.set(f.id, randomUUID());
      if (forms.length > 0) {
        await tx.insert(form).values(forms.map((f) => ({
            id: formId.get(f.id) as string,
            tenantId,
            name: f.name,
            description: f.description,
            module: f.module,
            storageType: f.storageType,
            targetTable: f.targetTable,
            columnMapping: f.columnMapping,
            isRecurring: f.isRecurring,
            recurrencePattern: f.recurrencePattern,
            workflowEnabled: f.workflowEnabled,
            workflowStatuses: f.workflowStatuses,
            isActive: f.isActive,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
          })));

        const fields = await tx.select().from(formField).where(isNull(formField.tenantId));
        if (fields.length > 0) {
          await tx.insert(formField).values(fields.map((f) => ({
              tenantId,
              formId: formId.get(f.formId) as string,
              fieldKey: f.fieldKey,
              fieldLabel: f.fieldLabel,
              fieldType: f.fieldType,
              fieldOptions: f.fieldOptions,
              isRequired: f.isRequired,
              validationRules: f.validationRules,
              displayOrder: f.displayOrder,
              createdAt: f.createdAt,
              updatedAt: f.updatedAt,
            })));
        }
      }
      outcome.forms = { cloned: forms.length, skipped: false };
    } else {
      outcome.forms = { cloned: 0, skipped: true };
    }

    if ((await this.countRows(tx, policy, eq(policy.tenantId, tenantId))) === 0) {
      const policies = await tx.select().from(policy).where(isNull(policy.tenantId));
      if (policies.length > 0) {
        await tx.insert(policy).values(policies.map((p) => ({
            tenantId,
            module: p.module,
            policyKey: p.policyKey,
            scopeType: p.scopeType,
            scopeId: p.scopeId,
            priority: p.priority,
            configJson: p.configJson,
            effectiveFrom: p.effectiveFrom,
            effectiveTo: p.effectiveTo,
            isActive: p.isActive,
            documentId: p.documentId,
            documentVersion: p.documentVersion,
            requireAcknowledgement: p.requireAcknowledgement,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })));
      }
      outcome.policies = { cloned: policies.length, skipped: false };
    } else {
      outcome.policies = { cloned: 0, skipped: true };
    }

    if ((await this.countRows(tx, taxonomy, eq(taxonomy.tenantId, tenantId))) === 0) {
      const taxonomies = await tx.select().from(taxonomy).where(isNull(taxonomy.tenantId));
      const taxonomyId = new Map<string, string>();
      for (const t of taxonomies) taxonomyId.set(t.id, randomUUID());
      if (taxonomies.length > 0) {
        await tx.insert(taxonomy).values(taxonomies.map((t) => ({
            id: taxonomyId.get(t.id) as string,
            tenantId,
            key: t.key,
            name: t.name,
            description: t.description,
            module: t.module,
            renderType: t.renderType,
            isActive: t.isActive,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          })));

        const terms = await tx.select().from(taxonomyTerm).where(isNull(taxonomyTerm.tenantId));
        if (terms.length > 0) {
          await tx.insert(taxonomyTerm).values(terms.map((t) => ({
              tenantId,
              taxonomyId: taxonomyId.get(t.taxonomyId) as string,
              value: t.value,
              label: t.label,
              sortOrder: t.sortOrder,
              isActive: t.isActive,
              metadata: t.metadata,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            })));
        }
      }
      outcome.taxonomies = { cloned: taxonomies.length, skipped: false };
    } else {
      outcome.taxonomies = { cloned: 0, skipped: true };
    }

    return outcome;
  }

  private async findTenantBySlug(slug: string) {
    const [row] = await this.db.client.select().from(tenant).where(eq(tenant.slug, slug)).limit(1);
    return row ?? null;
  }

  private async findWorkspaceProfileByEmail(email: string) {
    const [row] = await this.db.client.select().from(profile).where(eq(profile.email, email)).limit(1);
    return row ?? null;
  }

  private async findProfileByUsername(username: string) {
    const [row] = await this.db.client.select().from(profile).where(eq(profile.username, username)).limit(1);
    return row ?? null;
  }

  private async countRows(tx: Parameters<Parameters<AppDb['transaction']>[0]>[0], table: any, where: any) {
    const [row] = await tx.select({ value: count() }).from(table).where(where);
    return row.value;
  }

  private normalizeWorkspaceSlug(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!slug || slug.length < 2) throw new BadRequestException('A valid workspace slug is required');
    if (slug.length > 100) throw new BadRequestException('Workspace slug is too long');
    return slug;
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
