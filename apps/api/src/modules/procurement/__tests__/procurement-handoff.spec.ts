import { ProcurementService } from '../procurement.service';

describe('ProcurementService handoff', () => {
  const prisma: any = {
    requestInstance: { findUnique: jest.fn(), findMany: jest.fn() },
    procurementCase: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    procurementRequisition: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  };

  const service = new ProcurementService(prisma, {} as any, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('creates a procurement case from an approved procurement request', async () => {
    prisma.requestInstance.findUnique.mockResolvedValue({
      id: 101n,
      status: 'approved',
      requestType: { workflowType: 'procurement' },
      data: { title: 'Buy laptops' },
      createdBy: 9n,
      teamId: 4n,
      totalAmount: 0,
    });
    prisma.procurementRequisition.create.mockResolvedValue({ id: 'pr-1' });
    prisma.procurementCase.create.mockResolvedValue({ id: 'case-1', requestId: 101n, status: 'new' });

    const result = await (service as any).createCaseFromApprovedRequest('101', '12', { note: 'Accepted into sourcing' });

    expect(prisma.procurementCase.create).toHaveBeenCalled();
    expect(result.id).toBe('case-1');
  });

  it('rejects procurement case creation when request is not approved procurement workflow', async () => {
    prisma.requestInstance.findUnique.mockResolvedValue({
      id: 101n,
      status: 'draft',
      requestType: { workflowType: 'general' },
    });

    await expect((service as any).createCaseFromApprovedRequest('101', '12', {})).rejects.toThrow('Approved procurement request required');
  });
});
