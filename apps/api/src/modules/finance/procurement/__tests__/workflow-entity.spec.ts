import { WorkflowService } from '$modules/requests/workflow/workflow.service';
import { DrizzleService } from '$common/drizzle/drizzle.service';

describe('WorkflowService.startForEntity', () => {
  let service: WorkflowService;
  let drizzle: jest.Mocked<DrizzleService>;

  beforeEach(() => {
    drizzle = { $transaction: jest.fn(), workflow: { create: jest.fn() }, workflowStep: { create: jest.fn() }, workflowInstance: { create: jest.fn() } } as any;
    service = new WorkflowService(drizzle as any);
  });

  it('returns none when approvalFlowJson has no steps', async () => {
    const result = await service.startForEntity({
      entityId: 'abc-123',
      entityType: 'procurement_order',
      approvalFlowJson: { steps: [] },
      initiatedBy: '1',
    });
    expect(result.workflowStatus).toBe('none');
    expect(result.instanceId).toBeNull();
  });
});
