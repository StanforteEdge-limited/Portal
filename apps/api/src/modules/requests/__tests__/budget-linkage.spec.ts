import { RequestsService } from '../requests.service';

describe('RequestsService budget linkage', () => {
  const prisma: any = {
    financeBudget: { findUnique: jest.fn() },
    financeBudgetCommitment: { upsert: jest.fn(), updateMany: jest.fn() },
  };

  const service = new RequestsService(prisma, {} as any, {} as any, {} as any, { getRequestInclude: () => ({}) } as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects request budget line when line is not from the active approved revision', async () => {
    prisma.financeBudget.findUnique.mockResolvedValue({
      id: 'budget-1',
      status: 'approved',
      teamId: 4n,
      organizationId: 8n,
      projectId: null,
      currentActiveRevision: { id: 'rev-1', lines: [{ id: 'line-1', totalAmount: 1000 }] },
    });

    await expect(
      (service as any).validateBudgetSelection({ budget_id: 'budget-1', budget_line_id: 'line-2' }, { team_id: '4', organization_id: '8' })
    ).rejects.toThrow('Invalid budget_line_id');
  });

  it('accepts approved budget line that matches request scope', async () => {
    prisma.financeBudget.findUnique.mockResolvedValue({
      id: 'budget-1',
      status: 'approved',
      teamId: 4n,
      organizationId: 8n,
      projectId: null,
      currentActiveRevision: { id: 'rev-1', lines: [{ id: 'line-1', totalAmount: 1000 }] },
    });

    const result = await (service as any).validateBudgetSelection(
      { budget_id: 'budget-1', budget_line_id: 'line-1' },
      { team_id: '4', organization_id: '8' }
    );

    expect(result.budgetId).toBe('budget-1');
    expect(result.budgetRevisionId).toBe('rev-1');
    expect(result.budgetLineId).toBe('line-1');
  });

  it('creates consumed commitment for approved request statuses', async () => {
    await (service as any).syncBudgetCommitmentForRequest({
      id: 101n,
      status: 'approved',
      totalAmount: 2500,
      data: { budget_id: 'budget-1', budget_revision_id: 'rev-1', budget_line_id: 'line-1' },
    });

    expect(prisma.financeBudgetCommitment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: 'consumed',
          committedAmount: 2500,
          actualizedAmount: 2500,
        }),
      })
    );
  });

  it('releases commitment when request no longer carries budget linkage', async () => {
    await (service as any).syncBudgetCommitmentForRequest({
      id: 101n,
      status: 'returned',
      totalAmount: 2500,
      data: {},
    });

    expect(prisma.financeBudgetCommitment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'released' }),
      })
    );
  });
});
