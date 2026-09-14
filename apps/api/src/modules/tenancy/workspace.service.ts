import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { AppDb, DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { TenantContext } from '$common/auth/tenant-context';
import { generateUniqueUsername, makeUsernameSeed } from '$common/utils/username';
import { form, formField } from '$modules/requests/forms/model';
import { policy } from '$modules/requests/policies/model';
import { role, userRole } from '$modules/identity/rbac/model';
import { profile } from '$modules/identity/users/model';
import { taxonomy, taxonomyTerm } from '$modules/requests/taxonomy/model';
import { workflow, workflowStep, workflowStepApprover, workflowTransition } from '$modules/requests/workflow/model';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { tenant, tenantMembership } from './model';

const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'system', 'platform', 'stanforteedge',
  'stanforte-edge', 'demo', 'test', 'tenant', 'workspace', 'api', 'beta', 'www',
]);

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createWorkspace(dto: CreateWorkspaceDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const slug = this.normalizeSlug(dto.slug ?? name);
    if (RESERVED_SLUGS.has(slug)) throw new BadRequestException('Workspace slug is reserved');

    await this.tenantContext.runSystem('workspace.createWorkspace.validate', async () => {
      const [existingTenant, existingProfile] = await Promise.all([
        this.findTenantBySlug(slug),
        this.findProfileByEmail(email),
      ]);
      if (existingTenant) throw new BadRequestException('Workspace slug is already taken');
      if (existingProfile) {
        throw new BadRequestException('A user with this email already exists; sign in and join a workspace instead');
      }
    });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const username = await generateUniqueUsername(
      makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]),
      async (candidate) =>
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

  private async findProfileByEmail(email: string) {
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

  private normalizeSlug(value: string) {
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
}
