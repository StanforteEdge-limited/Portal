import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gt, inArray } from 'drizzle-orm';
import { AppDb, DbService } from '$common/db/db.service';
import { groupUser } from '$modules/communication/groups/model';
import { permission, role, rolePermission, userRole } from '$modules/identity/rbac/model';
import { requestInstance, requestType } from '$modules/hrm/requests/model';
import { toBigInt } from '$common/utils/ids';
import {
  WorkflowStepConfig,
  getWorkflowApproverLabel,
  isLeadOrManagerApprover,
  normalizeWorkflowStepApprover,
} from './workflow-approvers';
import {
  workflow,
  workflowHistory,
  workflowInstance,
  workflowStep,
  workflowStepApprover,
  workflowTransition,
} from './model';

@Injectable()
export class WorkflowService {
  constructor(private readonly db: DbService) {}

  async startForRequest(params: {
    requestId: bigint;
    requestTypeId: string;
    initiatedBy: string;
    amount?: number | null;
  }) {
    const [existing] = await this.db.client
      .select({
        workflowInstanceId: requestInstance.workflowInstanceId,
        teamId: requestInstance.teamId,
        data: requestInstance.data,
        requestType: {
          name: requestType.name,
          taxonomyKeys: requestType.taxonomyKeys,
          approvalFlowJson: requestType.approvalFlowJson,
        },
      })
      .from(requestInstance)
      .innerJoin(requestType, eq(requestInstance.requestTypeId, requestType.id))
      .where(eq(requestInstance.id, params.requestId))
      .limit(1);

    if (!existing) throw new NotFoundException('Request not found');
    if (existing.workflowInstanceId) {
      const [current] = await this.db.client
        .select({ id: workflowInstance.id, status: workflowInstance.status })
        .from(workflowInstance)
        .where(eq(workflowInstance.id, existing.workflowInstanceId))
        .limit(1);
      if (current?.status === 'pending') {
        return { instanceId: existing.workflowInstanceId, workflowStatus: 'pending' as const };
      }

      await this.db.client.update(requestInstance)
        .set({ workflowInstanceId: null })
        .where(eq(requestInstance.id, params.requestId));
    }

    const baseSteps = this.extractApprovalSteps(
      existing.requestType.approvalFlowJson,
      params.amount ?? undefined,
      (existing.data as Record<string, any>) || {}
    );
    const steps = this.normalizeStepsForLeave(existing.requestType.taxonomyKeys as string[] | null, baseSteps);
    if (steps.length === 0) {
      return { instanceId: null, workflowStatus: 'none' as const };
    }

    return this.db.client.transaction(async (tx) => {
      const [workflowRecord] = await tx.insert(workflow).values({
          name: `${existing.requestType.name} Workflow`,
          entityType: 'request',
          isActive: true,
          createdBy: toBigInt(params.initiatedBy),
          updatedBy: toBigInt(params.initiatedBy),
          config: { requestTypeId: params.requestTypeId }
        }).returning();

      const workflowSteps = await Promise.all(
        steps.map((step, index) => {
          const approver = normalizeWorkflowStepApprover(step);
          return tx.insert(workflowStep).values({
              workflowId: workflowRecord.id,
              name: getWorkflowApproverLabel(approver.approverType, approver.approverId) || `Step ${index + 1}`,
              stepType: 'approval',
              order: index + 1,
              isInitial: index === 0,
              isFinal: index === steps.length - 1,
              config: step,
              createdBy: toBigInt(params.initiatedBy),
              updatedBy: toBigInt(params.initiatedBy)
            }).returning().then(([row]) => row);
        })
      );

      await Promise.all(
        workflowSteps.map((step, index) => {
          const approver = normalizeWorkflowStepApprover(steps[index]);
          return tx.insert(workflowStepApprover).values({
              stepId: step.id,
              approverType: approver.approverType,
              approverId: approver.approverId,
              isRequired: true,
              approvalOrder: 1,
              createdBy: toBigInt(params.initiatedBy),
              updatedBy: toBigInt(params.initiatedBy)
            });
        })
      );

      for (let i = 0; i < workflowSteps.length - 1; i += 1) {
        await tx.insert(workflowTransition).values({
            workflowId: workflowRecord.id,
            fromStepId: workflowSteps[i].id,
            toStepId: workflowSteps[i + 1].id,
            name: `step_${i + 1}_approve`,
            action: 'approve',
            createdBy: toBigInt(params.initiatedBy),
            updatedBy: toBigInt(params.initiatedBy)
        });
      }

      const [instance] = await tx.insert(workflowInstance).values({
          workflowId: workflowRecord.id,
          entityType: 'request',
          entityId: params.requestId.toString(),
          currentStepId: workflowSteps[0].id,
          status: 'pending',
          initiatedBy: toBigInt(params.initiatedBy),
          metadata: {
            requestId: params.requestId.toString(),
            requestTypeId: params.requestTypeId
          }
        }).returning();

      let currentStepId: string | null = workflowSteps[0].id;
      let workflowStatus: 'pending' | 'approved' = 'pending';
      let autoApprovedInitial = false;

      if (steps[0] && isLeadOrManagerApprover(steps[0])) {
        const isLeadOrManager = await this.isTeamLeadOrManagerForRequestIdTx(tx, params.requestId, params.initiatedBy);
        if (isLeadOrManager) {
          autoApprovedInitial = true;
          const nextStep = workflowSteps[1];
          await tx.insert(workflowHistory).values({
              instanceId: instance.id,
              action: 'auto_approve',
              performedBy: toBigInt(params.initiatedBy),
              comment: 'Auto-approved: requester is team lead',
              fromStepId: workflowSteps[0].id,
              toStepId: nextStep?.id
          });
          if (nextStep) {
            currentStepId = nextStep.id;
          } else {
            currentStepId = null;
            workflowStatus = 'approved';
          }
        }
      }

      await tx.insert(workflowHistory).values({
          instanceId: instance.id,
          action: 'start',
          performedBy: toBigInt(params.initiatedBy),
          data: {
            currentStepId,
            autoApprovedInitial
          }
      });

      await tx.update(workflowInstance)
        .set({
          currentStepId,
          ...(workflowStatus === 'approved'
            ? {
                status: 'approved',
                completedAt: new Date()
              }
            : {})
        })
        .where(eq(workflowInstance.id, instance.id));

      await tx.update(requestInstance)
        .set({ workflowInstanceId: instance.id })
        .where(eq(requestInstance.id, params.requestId));

      return { instanceId: instance.id, workflowStatus, autoApprovedInitial };
    });
  }

  async startForEntity(params: {
    entityId: string;
    entityType: string;
    approvalFlowJson: any;
    initiatedBy: string;
    amount?: number | null;
    name?: string;
    data?: Record<string, any>;
  }) {
    const baseSteps = this.extractApprovalSteps(params.approvalFlowJson, params.amount ?? undefined, params.data || {});
    if (baseSteps.length === 0) {
      return { instanceId: null, workflowStatus: 'none' as const };
    }

    return this.db.client.transaction(async (tx) => {
      const [workflowRecord] = await tx.insert(workflow).values({
          name: params.name ?? `${params.entityType} workflow`,
          entityType: params.entityType,
          isActive: true,
          createdBy: toBigInt(params.initiatedBy),
          updatedBy: toBigInt(params.initiatedBy),
          config: {},
        }).returning();

      const workflowSteps = await Promise.all(
        baseSteps.map((step, index) => {
          const approver = normalizeWorkflowStepApprover(step);
          return tx.insert(workflowStep).values({
              workflowId: workflowRecord.id,
              name: getWorkflowApproverLabel(approver.approverType, approver.approverId) || `Step ${index + 1}`,
              stepType: 'approval',
              order: index + 1,
              isInitial: index === 0,
              isFinal: index === baseSteps.length - 1,
              config: step as any,
              createdBy: toBigInt(params.initiatedBy),
              updatedBy: toBigInt(params.initiatedBy),
            }).returning().then(([row]) => row);
        }),
      );

      const [instance] = await tx.insert(workflowInstance).values({
          workflowId: workflowRecord.id,
          entityType: params.entityType,
          entityId: params.entityId,
          currentStepId: workflowSteps[0].id,
          status: 'pending',
          initiatedBy: toBigInt(params.initiatedBy),
        }).returning();

      return { instanceId: instance.id, workflowStatus: 'pending' as const };
    });
  }

  async processDecision(params: {
    instanceId: string;
    action: 'approve' | 'reject';
    performedBy: string;
    comment?: string;
  }) {
    const instance = await this.findWorkflowInstanceWithCurrentStep(params.instanceId);
    if (!instance) throw new NotFoundException('Workflow instance not found');
    if (instance.status !== 'pending') throw new BadRequestException('Workflow instance is not active');
    if (!instance.currentStep) throw new BadRequestException('Workflow has no active step');
    const currentStep = instance.currentStep;

    const canApproveCurrentStep = await this.canUserActOnCurrentStep(instance, params.performedBy);
    if (!canApproveCurrentStep) {
      throw new BadRequestException('User is not an allowed approver for the current step');
    }

    return this.db.client.transaction(async (tx) => {
      if (params.action === 'reject') {
        await tx.insert(workflowHistory).values({
            instanceId: instance.id,
            action: 'reject',
            performedBy: toBigInt(params.performedBy),
            comment: params.comment,
            fromStepId: instance.currentStepId ?? undefined
        });

        await tx.update(workflowInstance)
          .set({
            status: 'rejected',
            currentStepId: null,
            completedAt: new Date()
          })
          .where(eq(workflowInstance.id, instance.id));

        return { status: 'rejected', completed: true };
      }

      const [nextStep] = await tx.select()
        .from(workflowStep)
        .where(and(eq(workflowStep.workflowId, instance.workflowId), gt(workflowStep.order, currentStep.order)))
        .orderBy(asc(workflowStep.order))
        .limit(1);

      await tx.insert(workflowHistory).values({
          instanceId: instance.id,
          action: 'approve',
          performedBy: toBigInt(params.performedBy),
          comment: params.comment,
          fromStepId: currentStep.id,
          toStepId: nextStep?.id
      });

      if (!nextStep) {
        await tx.update(workflowInstance)
          .set({
            status: 'approved',
            currentStepId: null,
            completedAt: new Date()
          })
          .where(eq(workflowInstance.id, instance.id));

        return { status: 'approved', completed: true };
      }

      await tx.update(workflowInstance)
        .set({ currentStepId: nextStep.id })
        .where(eq(workflowInstance.id, instance.id));

      return { status: 'pending', completed: false, currentStepId: nextStep.id };
    });
  }

  async getAvailableActions(instanceId: string) {
    const instance = await this.findWorkflowInstance(instanceId);
    if (!instance) throw new NotFoundException('Workflow instance not found');
    if (instance.status !== 'pending') return [];
    return ['approve', 'reject'];
  }

  async getHistory(instanceId: string) {
    return this.db.client
      .select()
      .from(workflowHistory)
      .where(eq(workflowHistory.instanceId, instanceId))
      .orderBy(asc(workflowHistory.createdAt));
  }

  async getInstance(instanceId: string) {
    const instance = await this.findWorkflowInstanceWithWorkflow(instanceId);
    if (!instance) throw new NotFoundException('Workflow instance not found');
    return instance;
  }

  async cancelWorkflow(instanceId: string, performedBy: string, reason?: string) {
    const instance = await this.findWorkflowInstance(instanceId);
    if (!instance) throw new NotFoundException('Workflow instance not found');
    if (instance.status !== 'pending') throw new BadRequestException('Workflow is already closed');

    return this.db.client.transaction(async (tx) => {
      await tx.insert(workflowHistory).values({
          instanceId,
          action: 'cancel',
          performedBy: toBigInt(performedBy),
          comment: reason,
          fromStepId: instance.currentStepId
      });

      await tx.update(workflowInstance)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          currentStepId: null
        })
        .where(eq(workflowInstance.id, instanceId));

      return { success: true };
    });
  }

  private extractApprovalSteps(flowJson: unknown, amount?: number, data?: Record<string, any>): WorkflowStepConfig[] {
    if (!flowJson || typeof flowJson !== 'object') return [];
    const maybeSteps = (flowJson as { steps?: WorkflowStepConfig[] }).steps;
    if (!Array.isArray(maybeSteps)) return [];

    return maybeSteps.filter((step) => {
      const effectiveAmount = amount ?? 0;
      if (step.min_amount !== undefined && effectiveAmount < step.min_amount) return false;
      if (step.approval_limit !== undefined && effectiveAmount > step.approval_limit) return false;
      
      if (step.conditions && Array.isArray(step.conditions)) {
        for (const cond of step.conditions) {
          const actualValue = data?.[cond.field];
          if (!this.evaluateCondition(actualValue, cond.operator, cond.value)) {
            return false;
          }
        }
      }
      return true;
    });
  }

  private evaluateCondition(actualValue: any, operator: string, expectedValue: any): boolean {
    if (actualValue === undefined || actualValue === null) return false;
    
    const actStr = String(actualValue).toLowerCase();
    const expStr = String(expectedValue).toLowerCase();
    
    const actDate = Date.parse(String(actualValue));
    const expDate = Date.parse(String(expectedValue));
    const isDateCompare = !isNaN(actDate) && !isNaN(expDate) && 
      String(actualValue).match(/^\d{4}-\d{2}-\d{2}/) && 
      String(expectedValue).match(/^\d{4}-\d{2}-\d{2}/);

    const actNum = isDateCompare ? actDate : Number(actualValue);
    const expNum = isDateCompare ? expDate : Number(expectedValue);

    switch (operator) {
      case 'equals': return actStr === expStr;
      case 'not_equals': return actStr !== expStr;
      case 'greater_than': return !isNaN(actNum) && !isNaN(expNum) && actNum > expNum;
      case 'less_than': return !isNaN(actNum) && !isNaN(expNum) && actNum < expNum;
      case 'contains': return actStr.includes(expStr);
      default: return false;
    }
  }

  private normalizeStepsForLeave(taxonomyKeys: string[] | null, steps: WorkflowStepConfig[]) {
    const key = String(taxonomyKeys?.[0] ?? '').trim().toLowerCase();
    if (!key.includes('leave')) return steps;

    const next = [...steps];
    const leadOrManagerIndex = next.findIndex((step) => {
      const approver = normalizeWorkflowStepApprover(step);
      return approver.approverType === 'relation' && approver.approverId === 'requester_team_lead_or_manager';
    });
    const hrIndex = next.findIndex((step) => {
      const approver = normalizeWorkflowStepApprover(step);
      return approver.approverType === 'permission' && approver.approverId === 'hr.approve';
    });

    if (leadOrManagerIndex === -1 && hrIndex === -1) {
      next.push(
        { approver: { type: 'relation', value: 'requester_team_lead_or_manager' } },
        { approver: { type: 'permission', value: 'hr.approve' } },
      );
      return next;
    }

    if (leadOrManagerIndex === -1 && hrIndex >= 0) {
      next.splice(hrIndex, 0, { approver: { type: 'relation', value: 'requester_team_lead_or_manager' } });
      return next;
    }

    if (hrIndex === -1) {
      next.push({ approver: { type: 'permission', value: 'hr.approve' } });
      return next;
    }

    if (leadOrManagerIndex > hrIndex) {
      next.splice(hrIndex, 0, { approver: { type: 'relation', value: 'requester_team_lead_or_manager' } });
    }

    return next;
  }

  private async canUserActOnCurrentStep(
    instance: {
      entityType: string;
      entityId: string;
      currentStep: { approvers: Array<{ approverType: string; approverId: string }> } | null;
    },
    userId: string
  ) {
    if (!instance.currentStep) return false;
    for (const approver of instance.currentStep.approvers) {
      const approverType = String(approver.approverType || '').trim().toLowerCase();
      const approverId = approver.approverId?.trim().toLowerCase();
      if (!approverId) continue;

      if (
        (approverType === 'relation' && approverId === 'requester_team_lead') ||
        (approverType === 'role' && approverId === 'team_lead')
      ) {
        const isLead = await this.isTeamLeadForRequest(instance, userId);
        if (isLead) return true;
        continue;
      }

      if (
        (approverType === 'relation' && approverId === 'requester_team_lead_or_manager') ||
        (approverType === 'role' && (approverId === 'team_lead_or_manager' || approverId === 'manager'))
      ) {
        const isLeadOrManager = await this.isTeamLeadOrManagerForRequest(instance, userId);
        if (isLeadOrManager) return true;
        continue;
      }

      if (approverType === 'office' || approverType === 'role') {
        const roleSlugs =
          approverType === 'role' && approverId === 'accountant'
            ? ['accountant', 'finance_manager']
            : [approverId];
        const [assignment] = await this.db.client
          .select({ id: userRole.id })
          .from(userRole)
          .innerJoin(role, eq(userRole.roleId, role.id))
          .where(and(eq(userRole.profileId, toBigInt(userId)), inArray(role.slug, roleSlugs)))
          .limit(1);
        if (assignment) return true;
      }

      if (
        approverType === 'permission' ||
        (approverType === 'role' && (approverId.includes('.') || approverId === 'accountant' || approverId === 'hr'))
      ) {
        const permissionSlug =
          approverType === 'permission'
            ? approverId
            : approverId === 'accountant'
              ? 'finance.approve'
              : approverId === 'hr'
                ? 'hr.approve'
                : approverId;
        const [assignment] = await this.db.client
          .select({ id: rolePermission.id })
          .from(rolePermission)
          .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
          .innerJoin(userRole, eq(rolePermission.roleId, userRole.roleId))
          .where(and(eq(userRole.profileId, toBigInt(userId)), eq(permission.slug, permissionSlug)))
          .limit(1);
        if (assignment) return true;
      }
    }

    return false;
  }

  private async isTeamLeadForRequest(
    instance: {
      entityType: string;
      entityId: string;
    },
    userId: string
  ) {
    if (instance.entityType !== 'request') return false;
    const request = await this.findRequestTeam(toBigInt(instance.entityId));
    if (!request?.teamId) return false;

    const [member] = await this.db.client
      .select({ id: groupUser.id })
      .from(groupUser)
      .where(and(eq(groupUser.groupId, request.teamId), eq(groupUser.userId, toBigInt(userId)), eq(groupUser.role, 'moderator')))
      .limit(1);
    return Boolean(member);
  }

  private async isTeamLeadOrManagerForRequest(
    instance: {
      entityType: string;
      entityId: string;
    },
    userId: string
  ) {
    if (instance.entityType !== 'request') return false;
    const request = await this.findRequestTeam(toBigInt(instance.entityId));
    if (!request?.teamId) return false;

    const [member] = await this.db.client
      .select({ id: groupUser.id })
      .from(groupUser)
      .where(and(
        eq(groupUser.groupId, request.teamId),
        eq(groupUser.userId, toBigInt(userId)),
        inArray(groupUser.role, ['moderator', 'admin']),
      ))
      .limit(1);
    if (member) return true;

    const [managerRole] = await this.db.client
      .select({ id: userRole.id })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(and(eq(userRole.profileId, toBigInt(userId)), eq(role.slug, 'manager')))
      .limit(1);
    return Boolean(managerRole);
  }

  private async isTeamLeadForRequestIdTx(
    tx: Parameters<Parameters<AppDb['transaction']>[0]>[0],
    requestId: bigint,
    userId: string
  ) {
    const request = await this.findRequestTeamTx(tx, requestId);
    if (!request?.teamId) return false;

    const [member] = await tx
      .select({ id: groupUser.id })
      .from(groupUser)
      .where(and(eq(groupUser.groupId, request.teamId), eq(groupUser.userId, toBigInt(userId)), eq(groupUser.role, 'moderator')))
      .limit(1);
    return Boolean(member);
  }

  private async isTeamLeadOrManagerForRequestIdTx(
    tx: Parameters<Parameters<AppDb['transaction']>[0]>[0],
    requestId: bigint,
    userId: string
  ) {
    const request = await this.findRequestTeamTx(tx, requestId);
    if (!request?.teamId) return false;

    const [member] = await tx
      .select({ id: groupUser.id })
      .from(groupUser)
      .where(and(
        eq(groupUser.groupId, request.teamId),
        eq(groupUser.userId, toBigInt(userId)),
        inArray(groupUser.role, ['moderator', 'admin']),
      ))
      .limit(1);
    if (member) return true;

    const [managerRole] = await tx
      .select({ id: userRole.id })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(and(eq(userRole.profileId, toBigInt(userId)), eq(role.slug, 'manager')))
      .limit(1);
    return Boolean(managerRole);
  }

  private async findWorkflowInstance(instanceId: string) {
    const [instance] = await this.db.client.select().from(workflowInstance).where(eq(workflowInstance.id, instanceId)).limit(1);
    return instance ?? null;
  }

  private async findWorkflowInstanceWithCurrentStep(instanceId: string) {
    const instance = await this.findWorkflowInstance(instanceId);
    if (!instance) return null;
    const [currentStep] = instance.currentStepId
      ? await this.db.client.select().from(workflowStep).where(eq(workflowStep.id, instance.currentStepId)).limit(1)
      : [null];
    const approvers = currentStep
      ? await this.db.client.select().from(workflowStepApprover).where(eq(workflowStepApprover.stepId, currentStep.id))
      : [];
    return { ...instance, currentStep: currentStep ? { ...currentStep, approvers } : null };
  }

  private async findWorkflowInstanceWithWorkflow(instanceId: string) {
    const instance = await this.findWorkflowInstance(instanceId);
    if (!instance) return null;
    const [workflowRecord] = await this.db.client.select().from(workflow).where(eq(workflow.id, instance.workflowId)).limit(1);
    const steps = workflowRecord
      ? await this.db.client
          .select()
          .from(workflowStep)
          .where(eq(workflowStep.workflowId, workflowRecord.id))
          .orderBy(asc(workflowStep.order))
      : [];
    return { ...instance, workflow: workflowRecord ? { ...workflowRecord, steps } : null };
  }

  private async findRequestTeam(requestId: bigint) {
    const [request] = await this.db.client
      .select({ teamId: requestInstance.teamId })
      .from(requestInstance)
      .where(eq(requestInstance.id, requestId))
      .limit(1);
    return request ?? null;
  }

  private async findRequestTeamTx(tx: Parameters<Parameters<AppDb['transaction']>[0]>[0], requestId: bigint) {
    const [request] = await tx
      .select({ teamId: requestInstance.teamId })
      .from(requestInstance)
      .where(eq(requestInstance.id, requestId))
      .limit(1);
    return request ?? null;
  }
}
