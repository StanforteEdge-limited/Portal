import { Test, TestingModule } from '@nestjs/testing';
import { DeductionService } from '../deduction.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StatutoryDeductionsQueryDto, RemitStatutoryDeductionsDto } from '../dto/statutory-deductions.dto';

const mockDeductions = [
  {
    id: 'uuid-1',
    requestId: 1n,
    deductionTypeId: 'type-uuid',
    amount: 1500,
    rate: 0.05,
    grossAmount: 30000,
    status: 'pending',
    remittedAt: null,
    remittanceRef: null,
    notes: null,
    createdBy: 1n,
    createdAt: new Date(),
    updatedAt: new Date(),
    deductionType: { id: 'type-uuid', name: 'WHT', code: 'wht' },
    request: { id: 1n, data: {}, createdAt: new Date(), status: 'completed' },
    createdByUser: { id: 1n, firstName: 'Admin', lastName: 'User' },
  },
];

describe('DeductionService — listRequestDeductions', () => {
  let service: DeductionService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      financeRequestDeduction: {
        findMany: jest.fn().mockResolvedValue(mockDeductions),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeductionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<DeductionService>(DeductionService);
  });

  it('should return paginated deductions', async () => {
    const result = await service.listRequestDeductions({});
    expect(result.data.items).toHaveLength(1);
    expect(result.data.pagination.total).toBe(1);
  });

  it('should pass status filter to where clause', async () => {
    await service.listRequestDeductions({ status: 'pending' });
    expect(prisma.financeRequestDeduction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'pending' }) }),
    );
  });
});

describe('DeductionService — batchRemitDeductions', () => {
  let service: DeductionService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      financeRequestDeduction: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeductionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<DeductionService>(DeductionService);
  });

  it('should remit selected deductions', async () => {
    prisma.financeRequestDeduction.findMany.mockResolvedValue([
      { id: 'uuid-1', status: 'pending' },
      { id: 'uuid-2', status: 'pending' },
    ]);
    const dto: RemitStatutoryDeductionsDto = { deduction_ids: ['uuid-1', 'uuid-2'], reference: 'WHT-001' };
    const result = await service.batchRemitDeductions(dto, 1);
    expect(result.updated).toBe(2);
  });

  it('should throw if any deduction is already remitted', async () => {
    prisma.financeRequestDeduction.findMany.mockResolvedValue([{ id: 'uuid-1', status: 'remitted' }]);
    await expect(
      service.batchRemitDeductions({ deduction_ids: ['uuid-1'], reference: 'ref' }, 1),
    ).rejects.toThrow();
  });

  it('should throw NotFoundException if an id is missing', async () => {
    prisma.financeRequestDeduction.findMany.mockResolvedValue([]);
    await expect(
      service.batchRemitDeductions({ deduction_ids: ['missing-uuid'], reference: 'ref' }, 1),
    ).rejects.toThrow();
  });
});
