import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GroupUserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import {
  WorkflowStepConfig,
  getWorkflowApproverLabel,
  isLeadOrManagerApprover,
  normalizeWorkflowStepApprover,
} from './workflow-approvers';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async startForRequest(params: {
    requestId: bigint;
    requestTypeId: string;
    initiatedBy: string;
    amount?: number | null;
  }) {
    const existing = await this.prisma.requestInstance.findUnique({
      where: { id: params.requestId },
      select: {
        workflowInstanceId: true,
        teamId: true,
        data: true,
        requestType: { select: { name: true, taxonomyKeys: true, approvalFlowJson: true } }
      }
    });

    if (!existing) throw new NotFoundException('Request not found');
    if (existing.workflowInstanceId) {
      const current = await this.prisma.workflowInstance.findUnique({
        where: { id: existing.workflowInstanceId },
        select: { id: true, status: true }
      });
      if (current?.status === 'pending') {
        return { instanceId: existing.workflowInstanceId, workflowStatus: 'pending' as const };
      }

      await this.prisma.requestInstance.update({
        where: { id: params.requestId },
        data: { workflowInstanceId: null }
      });
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

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          name: `${existing.requestType.name} Workflow`,
          entityType: 'request',
          isActive: true,
          createdBy: toBigInt(params.initiatedBy),
          updatedBy: toBigInt(params.initiatedBy),
          config: { requestTypeId: params.requestTypeId }
        }
      });

      const workflowSteps = await Promise.all(
        steps.map((step, index) => {
          const approver = normalizeWorkflowStepApprover(step);
          return tx.workflowStep.create({
            data: {
              workflowId: workflow.id,
              name: getWorkflowApproverLabel(approver.approverType, approver.approverId) || `Step ${index + 1}`,
              stepType: 'approval',
              order: index + 1,
              isInitial: index === 0,
              isFinal: index === steps.length - 1,
              config: step,
              createdBy: toBigInt(params.initiatedBy),
              updatedBy: toBigInt(params.initiatedBy)
            }
          });
        })
      );

      await Promise.all(
        workflowSteps.map((step, index) => {
          const approver = normalizeWorkflowStepApprover(steps[index]);
          return tx.workflowStepApprover.create({
            data: {
              stepId: step.id,
              approverType: approver.approverType,
              approverId: approver.approverId,
              isRequired: true,
              approvalOrder: 1,
              createdBy: toBigInt(params.initiatedBy),
              updatedBy: toBigInt(params.initiatedBy)
            }
          });
        })
      );

      for (let i = 0; i < workflowSteps.length - 1; i += 1) {
        await tx.workflowTransition.create({
          data: {
            workflowId: workflow.id,
            fromStepId: workflowSteps[i].id,
            toStepId: workflowSteps[i + 1].id,
            name: `step_${i + 1}_approve`,
            action: 'approve',
            createdBy: toBigInt(params.initiatedBy),
            updatedBy: toBigInt(params.initiatedBy)
          }
        });
      }

      const instance = await tx.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          entityType: 'request',
          entityId: params.requestId.toString(),
          currentStepId: workflowSteps[0].id,
          status: 'pending',
          initiatedBy: toBigInt(params.initiatedBy),
          metadata: {
            requestId: params.requestId.toString(),
            requestTypeId: params.requestTypeId
          }
        }
      });

      let currentStepId: string | null = workflowSteps[0].id;
      let workflowStatus: 'pending' | 'approved' = 'pending';
      let autoApprovedInitial = false;

      if (steps[0] && isLeadOrManagerApprover(steps[0])) {
        const isLeadOrManager = await this.isTeamLeadOrManagerForRequestIdTx(tx, params.requestId, params.initiatedBy);
        if (isLeadOrManager) {
          autoApprovedInitial = true;
          const nextStep = workflowSteps[1];
          await tx.workflowHistory.create({
            data: {
              instanceId: instance.id,
              action: 'auto_approve',
              performedBy: toBigInt(params.initiatedBy),
              comment: 'Auto-approved: requester is team lead',
              fromStepId: workflowSteps[0].id,
              toStepId: nextStep?.id
            }
          });
          if (nextStep) {
            currentStepId = nextStep.id;
          } else {
            currentStepId = null;
            workflowStatus = 'approved';
          }
        }
      }

      await tx.workflowHistory.create({
        data: {
          instanceId: instance.id,
          action: 'start',
          performedBy: toBigInt(params.initiatedBy),
          data: {
            currentStepId,
            autoApprovedInitial
          }
        }
      });

      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: {
          currentStepId,
          ...(workflowStatus === 'approved'
            ? {
                status: 'approved',
                completedAt: new Date()
              }
            : {})
        }
      });

      await tx.requestInstance.update({
        where: { id: params.requestId },
        data: { workflowInstanceId: instance.id }
      });

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

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          name: params.name ?? `${params.entityType} workflow`,
          entityType: params.entityType,
          isActive: true,
          createdBy: toBigInt(params.initiatedBy),
          updatedBy: toBigInt(params.initiatedBy),
          config: {},
        },
      });

      const workflowSteps = await Promise.all(
        baseSteps.map((step, index) => {
          const approver = normalizeWorkflowStepApprover(step);
          return tx.workflowStep.create({
            data: {
              workflowId: workflow.id,
              name: getWorkflowApproverLabel(approver.approverType, approver.approverId) || `Step ${index + 1}`,
              stepType: 'approval',
              order: index + 1,
              isInitial: index === 0,
              isFinal: index === baseSteps.length - 1,
              config: step as any,
              createdBy: toBigInt(params.initiatedBy),
              updatedBy: toBigInt(params.initiatedBy),
            },
          });
        }),
      );

      const instance = await tx.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          entityType: params.entityType,
          entityId: params.entityId,
          currentStepId: workflowSteps[0].id,
          status: 'pending',
          initiatedBy: toBigInt(params.initiatedBy),
        },
      });

      return { instanceId: instance.id, workflowStatus: 'pending' as const };
    });
  }

  async processDecision(params: {
    instanceId: string;
    action: 'approve' | 'reject';
    performedBy: string;
    comment?: string;
  }) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: params.instanceId },
      include: { currentStep: { include: { approvers: true } } }
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    if (instance.status !== 'pending') throw new BadRequestException('Workflow instance is not active');
    if (!instance.currentStep) throw new BadRequestException('Workflow has no active step');
    const currentStep = instance.currentStep;

    const canApproveCurrentStep = await this.canUserActOnCurrentStep(instance, params.performedBy);
    if (!canApproveCurrentStep) {
      throw new BadRequestException('User is not an allowed approver for the current step');
    }

    return this.prisma.$transaction(async (tx) => {
      if (params.action === 'reject') {
        await tx.workflowHistory.create({
          data: {
            instanceId: instance.id,
            action: 'reject',
            performedBy: toBigInt(params.performedBy),
            comment: params.comment,
            fromStepId: instance.currentStepId ?? undefined
          }
        });

        await tx.workflowInstance.update({
          where: { id: instance.id },
          data: {
            status: 'rejected',
            currentStepId: null,
            completedAt: new Date()
          }
        });

        return { status: 'rejected', completed: true };
      }

      const nextStep = await tx.workflowStep.findFirst({
        where: {
          workflowId: instance.workflowId,
          order: { gt: currentStep.order }
        },
        orderBy: { order: 'asc' }
      });

      await tx.workflowHistory.create({
        data: {
          instanceId: instance.id,
          action: 'approve',
          performedBy: toBigInt(params.performedBy),
          comment: params.comment,
          fromStepId: currentStep.id,
          toStepId: nextStep?.id
        }
      });

      if (!nextStep) {
        await tx.workflowInstance.update({
          where: { id: instance.id },
          data: {
            status: 'approved',
            currentStepId: null,
            completedAt: new Date()
          }
        });

        return { status: 'approved', completed: true };
      }

      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { currentStepId: nextStep.id }
      });

      return { status: 'pending', completed: false, currentStepId: nextStep.id };
    });
  }

  async getAvailableActions(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    if (instance.status !== 'pending') return [];
    return ['approve', 'reject'];
  }

  async getHistory(instanceId: string) {
    return this.prisma.workflowHistory.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getInstance(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: {
          include: {
            steps: { orderBy: { order: 'asc' }
            }
          }
        }
      }
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    return instance;
  }

  async cancelWorkflow(instanceId: string, performedBy: string, reason?: string) {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    if (instance.status !== 'pending') throw new BadRequestException('Workflow is already closed');

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowHistory.create({
        data: {
          instanceId,
          action: 'cancel',
          performedBy: toBigInt(performedBy),
          comment: reason,
          fromStepId: instance.currentStepId
        }
      });

      await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          currentStepId: null
        }
      });

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
        const hasRole = await this.prisma.userRole.count({
          where: {
            profileId: toBigInt(userId),
            role: { slug: { in: roleSlugs } }
          }
        });
        if (hasRole > 0) return true;
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
        const hasPermission = await this.prisma.rolePermission.count({
          where: {
            role: {
              users: {
                some: { profileId: toBigInt(userId) }
              }
            },
            permission: { slug: permissionSlug }
          }
        });
        if (hasPermission > 0) return true;
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
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: toBigInt(instance.entityId) },
      select: { teamId: true }
    });
    if (!request?.teamId) return false;

    const member = await this.prisma.groupUser.findFirst({
      where: {
        groupId: request.teamId,
        userId: toBigInt(userId),
        role: GroupUserRole.moderator
      },
      select: { id: true }
    });
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
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: toBigInt(instance.entityId) },
      select: { teamId: true }
    });
    if (!request?.teamId) return false;

    const member = await this.prisma.groupUser.findFirst({
      where: {
        groupId: request.teamId,
        userId: toBigInt(userId),
        role: { in: [GroupUserRole.moderator, GroupUserRole.admin] }
      },
      select: { id: true }
    });
    if (member) return true;

    const managerRole = await this.prisma.userRole.findFirst({
      where: {
        profileId: toBigInt(userId),
        role: { slug: 'manager' }
      },
      select: { id: true }
    });
    return Boolean(managerRole);
  }

  private async isTeamLeadForRequestIdTx(
    tx: any,
    requestId: bigint,
    userId: string
  ) {
    const request = await tx.requestInstance.findUnique({
      where: { id: requestId },
      select: { teamId: true }
    });
    if (!request?.teamId) return false;

    const member = await tx.groupUser.findFirst({
      where: {
        groupId: request.teamId,
        userId: toBigInt(userId),
        role: GroupUserRole.moderator
      },
      select: { id: true }
    });
    return Boolean(member);
  }

  private async isTeamLeadOrManagerForRequestIdTx(
    tx: any,
    requestId: bigint,
    userId: string
  ) {
    const request = await tx.requestInstance.findUnique({
      where: { id: requestId },
      select: { teamId: true }
    });
    if (!request?.teamId) return false;

    const member = await tx.groupUser.findFirst({
      where: {
        groupId: request.teamId,
        userId: toBigInt(userId),
        role: { in: [GroupUserRole.moderator, GroupUserRole.admin] }
      },
      select: { id: true }
    });
    if (member) return true;

    const managerRole = await tx.userRole.findFirst({
      where: { profileId: toBigInt(userId), role: { slug: 'manager' } },
      select: { id: true }
    });
    return Boolean(managerRole);
  }
}
