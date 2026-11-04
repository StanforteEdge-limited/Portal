import { describe, expect, it, vi } from 'vitest';
import { TasksService } from '$apps/hr/tasks/repository';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import {
  sprint,
  teamGoal,
  workItem,
  workItemComment,
} from '$apps/hr/tasks/model';
import { project } from '$apps/hr/projects/model';

describe('TasksService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    requireTenantId: vi.fn().mockReturnValue(tenantId),
    currentTenantId: vi.fn().mockReturnValue(tenantId),
    require: vi.fn().mockReturnValue({ tenantId, profileId: 10n, membershipId: 1n, isOwner: false }),
  });

  const mockTimesheets = () => ({});

  it('throws NotFoundException when retrieving non-existent work item', async () => {
    const db = createFakeDb().queue(workItem, []);
    const service = new TasksService(
      db as any,
      mockTenantContext() as any,
      mockTimesheets() as any,
    );

    await expect(service.getItem('10', '999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents unauthorized users from deleting work items', async () => {
    const db = createFakeDb().queue(workItem, [
      {
        id: '100',
        createdById: 50n,
        assignedById: 60n,
        assignedToId: 10n,
      },
    ]);
    const service = new TasksService(
      db as any,
      mockTenantContext() as any,
      mockTimesheets() as any,
    );

    // Actor 10n is assignee but neither creator (50n) nor assigner (60n)
    await expect(service.deleteItem('10', '100')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows creator to delete work item', async () => {
    const db = createFakeDb().queue(workItem, [
      {
        id: '100',
        createdById: 10n,
        assignedById: 60n,
      },
    ]);
    const service = new TasksService(
      db as any,
      mockTenantContext() as any,
      mockTimesheets() as any,
    );

    const res = await service.deleteItem('10', '100');

    expect(res).toEqual({ success: true });
    expect(db.deletes.some((d) => d.table === workItem)).toBe(true);
  });

  it('rejects adding comments to non-existent work items', async () => {
    const db = createFakeDb().queue(workItem, []);
    const service = new TasksService(
      db as any,
      mockTenantContext() as any,
      mockTimesheets() as any,
    );

    await expect(
      service.addComment('10', '999', { body: 'Great progress' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects work item creation if parent work item is not found', async () => {
    const db = createFakeDb().queue(workItem, []); // parent lookup returns empty
    const service = new TasksService(
      db as any,
      mockTenantContext() as any,
      mockTimesheets() as any,
    );

    await expect(
      service.upsertItem('10', {
        title: 'Child Task',
        parent_id: '888',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects work item creation if sprint belongs to different project', async () => {
    const db = createFakeDb()
      .queue(project, [{ id: 100n, tenantId: 1n }])
      .queue(sprint, [{ id: 200n, projectId: 999n, tenantId: 1n }]); // different project

    const service = new TasksService(
      db as any,
      mockTenantContext() as any,
      mockTimesheets() as any,
    );

    await expect(
      service.upsertItem('10', {
        title: 'Task with sprint mismatch',
        project_id: '100',
        sprint_id: '200',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

