import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinanceService } from '../finance.service';

describe('FinanceService budget revisions', () => {
  const prisma: any = {
    financeBudget: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    financeBudgetRevision: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    financeBudgetRevisionLine: { createMany: jest.fn(), deleteMany: jest.fn() },
    financeBudgetAssumption: { createMany: jest.fn(), deleteMany: jest.fn() },
    financeBudgetPortfolio: { createMany: jest.fn(), deleteMany: jest.fn() },
    financeFund: { findUnique: jest.fn() },
    financeGrant: { findUnique: jest.fn() },
    group: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  };

  const service = new FinanceService(prisma, {} as any, {} as any, {} as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.group.findUnique.mockResolvedValue({ id: 4n, type: 'department', organizationId: 8n });
  });

  it('creates a draft revision when creating a budget', async () => {
    prisma.financeBudget.create.mockResolvedValue({ id: 'budget-1' });
    prisma.financeBudgetRevision.create.mockResolvedValue({ id: 'rev-1', budgetId: 'budget-1', revisionNumber: 1, status: 'draft' });
    prisma.financeBudget.findUnique.mockResolvedValue({
      id: 'budget-1',
      name: 'July OPEX',
      status: 'draft',
      currentActiveRevisionId: null,
      draftRevisionId: 'rev-1',
      revisions: [{ id: 'rev-1', revisionNumber: 1, status: 'draft', lines: [] }],
      lines: [],
      assumptions: [],
      portfolio: [],
      fund: null,
      grant: null,
    });

    const dto = {
      name: 'July OPEX',
      scope_type: 'team',
      budget_type: 'team',
      period_type: 'monthly',
      month: 7,
      fiscal_year: 2026,
      team_id: '4',
      lines: [{ line_name: 'Rent', total_amount: 100000 }],
    };

    const result = await (service as any).createBudget(dto, '9');

    expect(prisma.financeBudgetRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          budgetId: 'budget-1',
          revisionNumber: 1,
          status: 'draft',
        }),
      }),
    );
    expect(prisma.financeBudget.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 8n,
          teamId: 4n,
        }),
      })
    );
    expect(result.id).toBe('budget-1');
  });

  it('updates the draft revision instead of overwriting the approved baseline', async () => {
    prisma.financeBudget.findUnique.mockResolvedValueOnce({
      id: 'budget-1',
      currentActiveRevisionId: 'rev-1',
      draftRevisionId: 'rev-2',
      status: 'approved',
    });
    prisma.financeBudgetRevision.update.mockResolvedValue({ id: 'rev-2', budgetId: 'budget-1', revisionNumber: 2, status: 'draft' });
    prisma.financeBudget.findUnique.mockResolvedValueOnce({
      id: 'budget-1',
      draftRevisionId: 'rev-2',
      currentActiveRevisionId: 'rev-1',
      revisions: [{ id: 'rev-2', revisionNumber: 2, status: 'draft', lines: [] }],
      lines: [], assumptions: [], portfolio: [], fund: null, grant: null,
    });

    await (service as any).updateBudget('budget-1', {
      name: 'July OPEX Revised',
      scope_type: 'team',
      budget_type: 'team',
      period_type: 'monthly',
      month: 7,
      fiscal_year: 2026,
      team_id: '4',
      lines: [{ line_name: 'Rent', total_amount: 120000 }],
    }, '9');

    expect(prisma.financeBudgetRevision.update).toHaveBeenCalled();
  });

  it('lists approved budget lines for a project scope', async () => {
    prisma.financeBudget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        name: 'Project Alpha Budget',
        scopeType: 'project',
        organizationId: 8n,
        teamId: null,
        projectId: 9n,
        currentActiveRevisionId: 'rev-1',
        currentActiveRevision: {
          lines: [{ id: 'line-1', lineLabel: 'Travel', totalAmount: 5000, amount: 5000, chartAccountId: 'acc-1' }],
        },
      },
    ]);

    const result = await (service as any).listApprovedBudgetLines({ project_id: '9' });

    expect(prisma.financeBudget.findMany).toHaveBeenCalled();
    expect(result[0].budget_id).toBe('budget-1');
    expect(result[0].budget_line_id).toBe('line-1');
  });

  it('serializes committed and consumed totals on budgets', () => {
    const result = (service as any).serializeBudget({
      id: 'budget-1',
      organizationId: null,
      teamId: null,
      projectId: null,
      parentBudgetId: null,
      fund: null,
      grant: null,
      name: 'Budget',
      scopeType: 'project',
      budgetType: 'project',
      periodType: 'annual',
      fiscalYear: 2026,
      quarter: null,
      month: null,
      currency: 'NGN',
      exchangeRate: null,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'approved',
      totalBudget: 5000,
      notes: null,
      assumptions: [],
      portfolio: [],
      currentActiveRevision: null,
      draftRevision: null,
      currentActiveRevisionId: null,
      draftRevisionId: null,
      revisions: [],
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      commitments: [
        { committedAmount: 1000, actualizedAmount: null },
        { committedAmount: 500, actualizedAmount: 500 },
      ],
    });

    expect(result.total_committed).toBe(1500);
    expect(result.total_consumed).toBe(500);
    expect(result.total_available).toBe(3500);
  });
});
