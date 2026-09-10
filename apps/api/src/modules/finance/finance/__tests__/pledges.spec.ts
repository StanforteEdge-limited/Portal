import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinanceService } from '../finance.service';

describe('FinanceService — pledge CRUD', () => {
  const prisma: any = {
    financePledge: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    financeDonor: { findUnique: jest.fn() },
    financeGrant: { findUnique: jest.fn() },
    financeFund: { findUnique: jest.fn() },
    financeIncomeEntry: { aggregate: jest.fn() },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };

  const service = new FinanceService(prisma, {} as any, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('createPledge — creates pledge with generated number', async () => {
    prisma.financeDonor.findUnique.mockResolvedValue({ id: 'donor-1', name: 'USAID' });
    prisma.$queryRaw.mockResolvedValue([{ last_number: 0 }]);
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.financePledge.create.mockResolvedValue({
      id: 'pledge-1',
      pledgeNumber: 'PLG-2026-001',
      donorId: 'donor-1',
      amount: 5000000,
      currency: 'NGN',
      status: 'pending',
      receivedAmount: 0,
      pledgedAt: new Date('2026-07-05'),
    });
    const result = await service.createPledge({
      donor_id: 'donor-1',
      amount: 5000000,
      pledged_at: '2026-07-05',
    }, 1);
    expect(prisma.financePledge.create).toHaveBeenCalled();
    expect(result.pledgeNumber).toBe('PLG-2026-001');
  });

  it('createPledge — throws NotFoundException if donor not found', async () => {
    prisma.financeDonor.findUnique.mockResolvedValue(null);
    await expect(
      service.createPledge({ donor_id: 'bad-id', amount: 1000, pledged_at: '2026-07-05' }, 1)
    ).rejects.toThrow(NotFoundException);
  });

  it('deletePledge — throws BadRequestException if status is not pending or cancelled', async () => {
    prisma.financePledge.findUnique.mockResolvedValue({ id: 'pledge-1', status: 'partial' });
    await expect(service.deletePledge('pledge-1')).rejects.toThrow(BadRequestException);
  });

  it('deletePledge — deletes if status is pending', async () => {
    prisma.financePledge.findUnique.mockResolvedValue({ id: 'pledge-1', status: 'pending' });
    prisma.financePledge.delete.mockResolvedValue({ id: 'pledge-1' });
    await service.deletePledge('pledge-1');
    expect(prisma.financePledge.delete).toHaveBeenCalledWith({ where: { id: 'pledge-1' } });
  });
});

describe('FinanceService — income pledge recompute', () => {
  const prisma: any = {
    financeIncomeEntry: { aggregate: jest.fn() },
    financePledge: { update: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };

  const service = new FinanceService(prisma, {} as any, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('recomputePledgeStatus — sets partial when received < pledged', async () => {
    prisma.financeIncomeEntry.aggregate.mockResolvedValue({ _sum: { amount: 1000000 } });
    prisma.financePledge.update.mockResolvedValue({ id: 'p1', status: 'partial', receivedAmount: 1000000 });
    await (service as any).recomputePledgeStatus('p1', 5000000, prisma);
    expect(prisma.financePledge.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: expect.objectContaining({ status: 'partial' }),
    }));
  });

  it('recomputePledgeStatus — sets fulfilled when received >= pledged', async () => {
    prisma.financeIncomeEntry.aggregate.mockResolvedValue({ _sum: { amount: 5000000 } });
    prisma.financePledge.update.mockResolvedValue({ id: 'p1', status: 'fulfilled', receivedAmount: 5000000 });
    await (service as any).recomputePledgeStatus('p1', 5000000, prisma);
    expect(prisma.financePledge.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'fulfilled' }),
    }));
  });
});
