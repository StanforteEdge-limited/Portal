import { describe, expect, it } from 'vitest';
import { WorkflowService, normalizeWorkflowStepApprover, getWorkflowApproverLabel } from '$apps/hr/workflow/repository';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { workflow, workflowHistory, workflowInstance } from '$apps/hr/workflow/model';

describe('WorkflowService (unit, fake db)', () => {
  it('normalizes workflow step approvers correctly', () => {
    expect(normalizeWorkflowStepApprover({ role: 'finance.approve' })).toEqual({
      approverType: 'permission',
      approverId: 'finance.approve',
    });

    expect(normalizeWorkflowStepApprover({ role: 'finance_manager' })).toEqual({
      approverType: 'role',
      approverId: 'finance_manager',
    });

    expect(
      normalizeWorkflowStepApprover({
        approver: { type: 'relation', value: 'requester_team_lead' },
      } as any),
    ).toEqual({
      approverType: 'relation',
      approverId: 'requester_team_lead',
    });
  });

  it('generates user-friendly approver labels', () => {
    expect(getWorkflowApproverLabel('relation', 'requester_team_lead')).toBe('Team lead approval');
    expect(getWorkflowApproverLabel('permission', 'finance.approve')).toBe('Finance approval');
    expect(getWorkflowApproverLabel('office', 'coo')).toBe('COO approval');
  });

  it('throws NotFoundException when fetching a missing workflow instance', async () => {
    const db = createFakeDb().queue(workflowInstance, []);
    const service = new WorkflowService(db as any);

    await expect(service.getInstance('wf_missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when cancelling a missing workflow', async () => {
    const db = createFakeDb().queue(workflowInstance, []);
    const service = new WorkflowService(db as any);

    await expect(service.cancelWorkflow('wf_missing', '10')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects cancellation of an already closed workflow', async () => {
    const db = createFakeDb().queue(workflowInstance, [
      { id: 'wf_closed', status: 'approved' },
    ]);
    const service = new WorkflowService(db as any);

    await expect(
      service.cancelWorkflow('wf_closed', '10', 'No longer needed'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels a pending workflow, updates state, and logs history', async () => {
    const db = createFakeDb()
      .queue(workflowInstance, [
        { id: 'wf_1', status: 'pending', currentStepId: 'step_1' },
      ])
      .insertReturning(workflowHistory, { id: 'hist_1' });

    const service = new WorkflowService(db as any);

    await service.cancelWorkflow('wf_1', '10', 'User cancelled request');

    expect(db.transactions).toBe(1);
    expect(db.inserts.some((i) => i.table === workflowHistory)).toBe(true);
    expect(
      db.updates.some(
        (u) => u.table === workflowInstance && (u.values as any).status === 'cancelled',
      ),
    ).toBe(true);
  });
});
