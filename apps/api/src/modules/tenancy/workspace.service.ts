import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { TenantContext } from '$common/auth/tenant-context';
import { generateUniqueUsername, makeUsernameSeed } from '$common/utils/username';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'system', 'platform', 'stanforteedge',
  'stanforte-edge', 'demo', 'test', 'tenant', 'workspace', 'api', 'beta', 'www',
]);

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createWorkspace(dto: CreateWorkspaceDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const slug = this.normalizeSlug(dto.slug ?? name);
    if (RESERVED_SLUGS.has(slug)) throw new BadRequestException('Workspace slug is reserved');

    await this.tenantContext.runSystem('workspace.createWorkspace.validate', async () => {
      const [existingTenant, existingProfile] = await Promise.all([
        this.drizzle.tenant.findUnique({ where: { slug } }),
        this.drizzle.profile.findUnique({ where: { email } }),
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
          this.drizzle.profile.findFirst({ where: { username: candidate } }).then(Boolean),
        ),
    );

    return this.tenantContext.runSystem('workspace.createWorkspace', () =>
      this.drizzle.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name, slug, plan: dto.plan?.trim() || 'trial' },
        });

        const defaults = await this.cloneTemplates(tx, tenant.id);

        const owner = await tx.profile.create({
          data: {
            username,
            email,
            passwordHash,
            type: 'admin',
            status: 'active',
            firstName: dto.first_name,
            lastName: dto.last_name,
          },
        });

        await tx.tenantMembership.create({
          data: { tenantId: tenant.id, profileId: owner.id, status: 'active', isOwner: true },
        });

        const adminRoles = await tx.role.findMany({
          where: { slug: { in: ['administrator', 'admin'] }, isActive: true, tenantId: null },
          select: { id: true },
        });

        if (adminRoles.length > 0) {
          await tx.userRole.createMany({
            data: adminRoles.map((role) => ({
              profileId: owner.id,
              roleId: role.id,
              tenantId: tenant.id,
              organizationId: null,
              isPrimaryRole: true,
            })),
            skipDuplicates: true,
          });
        }

        return {
          tenant_id: tenant.id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
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
      this.drizzle.$transaction(
        async (tx) => ({ success: true, ...(await this.cloneTemplates(tx, context.tenantId)) }),
      ),
    );
  }

  private async cloneTemplates(tx: DrizzleService, tenantId: bigint) {
    const outcome = {
      workflows: { cloned: 0, skipped: false },
      forms: { cloned: 0, skipped: false },
      policies: { cloned: 0, skipped: false },
      taxonomies: { cloned: 0, skipped: false },
    };

    if ((await tx.workflow.count({ where: { tenantId } })) === 0) {
      const workflows = await tx.workflow.findMany({ where: { tenantId: null } });
      const workflowId = new Map<string, string>();
      for (const w of workflows) workflowId.set(w.id, randomUUID());
      if (workflows.length > 0) {
        await tx.workflow.createMany({
          data: workflows.map((w) => ({
            id: workflowId.get(w.id) as string,
            tenantId,
            name: w.name,
            description: w.description,
            entityType: w.entityType,
            config: w.config,
            isActive: w.isActive,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
          })),
        });

        const steps = await tx.workflowStep.findMany({ where: { tenantId: null } });
        const stepId = new Map<string, string>();
        for (const s of steps) stepId.set(s.id, randomUUID());
        if (steps.length > 0) {
          await tx.workflowStep.createMany({
            data: steps.map((s) => ({
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
            })),
          });

          const approvers = await tx.workflowStepApprover.findMany({ where: { tenantId: null } });
          if (approvers.length > 0) {
            await tx.workflowStepApprover.createMany({
              data: approvers.map((a) => ({
                tenantId,
                stepId: stepId.get(a.stepId) as string,
                approverType: a.approverType,
                approverId: a.approverId,
                isRequired: a.isRequired,
                approvalOrder: a.approvalOrder,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
              })),
            });
          }

          const transitions = await tx.workflowTransition.findMany({ where: { tenantId: null } });
          if (transitions.length > 0) {
            await tx.workflowTransition.createMany({
              data: transitions.map((t) => ({
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
              })),
            });
          }
        }
      }
      outcome.workflows = { cloned: workflows.length, skipped: false };
    } else {
      outcome.workflows = { cloned: 0, skipped: true };
    }

    if ((await tx.form.count({ where: { tenantId } })) === 0) {
      const forms = await tx.form.findMany({ where: { tenantId: null } });
      const formId = new Map<string, string>();
      for (const f of forms) formId.set(f.id, randomUUID());
      if (forms.length > 0) {
        await tx.form.createMany({
          data: forms.map((f) => ({
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
          })),
        });

        const fields = await tx.formField.findMany({ where: { tenantId: null } });
        if (fields.length > 0) {
          await tx.formField.createMany({
            data: fields.map((f) => ({
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
            })),
          });
        }
      }
      outcome.forms = { cloned: forms.length, skipped: false };
    } else {
      outcome.forms = { cloned: 0, skipped: true };
    }

    if ((await tx.policy.count({ where: { tenantId } })) === 0) {
      const policies = await tx.policy.findMany({ where: { tenantId: null } });
      if (policies.length > 0) {
        await tx.policy.createMany({
          data: policies.map((p) => ({
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
          })),
        });
      }
      outcome.policies = { cloned: policies.length, skipped: false };
    } else {
      outcome.policies = { cloned: 0, skipped: true };
    }

    if ((await tx.taxonomy.count({ where: { tenantId } })) === 0) {
      const taxonomies = await tx.taxonomy.findMany({ where: { tenantId: null } });
      const taxonomyId = new Map<string, string>();
      for (const t of taxonomies) taxonomyId.set(t.id, randomUUID());
      if (taxonomies.length > 0) {
        await tx.taxonomy.createMany({
          data: taxonomies.map((t) => ({
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
          })),
        });

        const terms = await tx.taxonomyTerm.findMany({ where: { tenantId: null } });
        if (terms.length > 0) {
          await tx.taxonomyTerm.createMany({
            data: terms.map((t) => ({
              tenantId,
              taxonomyId: taxonomyId.get(t.taxonomyId) as string,
              value: t.value,
              label: t.label,
              sortOrder: t.sortOrder,
              isActive: t.isActive,
              metadata: t.metadata,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            })),
          });
        }
      }
      outcome.taxonomies = { cloned: taxonomies.length, skipped: false };
    } else {
      outcome.taxonomies = { cloned: 0, skipped: true };
    }

    return outcome;
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