import { WorkflowService } from '../../workflow/workflow.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('WorkflowService.startForEntity', () => {
  let service: WorkflowService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = { $transaction: jest.fn(), workflow: { create: jest.fn() }, workflowStep: { create: jest.fn() }, workflowInstance: { create: jest.fn() } } as any;
    service = new WorkflowService(prisma as any);
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
