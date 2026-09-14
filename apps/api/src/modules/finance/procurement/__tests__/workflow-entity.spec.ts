import { WorkflowService } from '$modules/requests/workflow/workflow.service';

describe('WorkflowService.startForEntity', () => {
  let service: WorkflowService;
  let db: any;

  beforeEach(() => {
    db = { client: { transaction: jest.fn() } };
    service = new WorkflowService(db);
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
