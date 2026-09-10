import { BadRequestException } from '@nestjs/common';
import { FinanceService } from '../finance.service';

function createService(prisma) {
  return new FinanceService(prisma, {} as any, {} as any, {} as any);
}

describe('FinanceService — statutory deduction manual entries', () => {
  let prisma;

  beforeEach(() => {
    prisma = {
      financeJournalEntry: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      financeDeductionType: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      financeReportingPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'rp-1' }),
      },
      $transaction: jest.fn(async (fns) => {
        if (Array.isArray(fns)) return Promise.all(fns);
        return fns(prisma);
      }),
    };
    jest.clearAllMocks();
  });

  describe('listStatutoryDeductionManualEntries', () => {
    it('filters by sourceType statutory_deduction_manual_entry', async () => {
      prisma.financeJournalEntry.findMany.mockResolvedValue([
        { id: 'je-1', sourceType: 'statutory_deduction_manual_entry', lines: [] },
      ]);
      prisma.financeJournalEntry.count.mockResolvedValue(1);

      const service = createService(prisma);
      const result = await service.listStatutoryDeductionManualEntries({ page: 1, per_page: 10 });

      expect(prisma.financeJournalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sourceType: 'statutory_deduction_manual_entry' }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ items: expect.any(Array), meta: expect.any(Object) }),
        }),
      );
    });

    it('supports date range filtering', async () => {
      const service = createService(prisma);
      await service.listStatutoryDeductionManualEntries({ from: '2026-01-01', to: '2026-06-30' });

      expect(prisma.financeJournalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceType: 'statutory_deduction_manual_entry',
            entryDate: expect.objectContaining({
              gte: new Date('2026-01-01'),
              lte: new Date('2026-06-30'),
            }),
          }),
        }),
      );
    });

    it('paginates results', async () => {
      prisma.financeJournalEntry.count.mockResolvedValue(25);
      const service = createService(prisma);
      const result = await service.listStatutoryDeductionManualEntries({ page: 2, per_page: 10 });

      expect(prisma.financeJournalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.data.meta).toEqual(
        expect.objectContaining({ page: 2, per_page: 10, total: 25, pages: 3 }),
      );
    });
  });

  describe('createStatutoryDeductionManualEntry', () => {
    const validDto = {
      entry_date: '2026-07-17',
      memo: 'PIT withholding July',
      currency: 'NGN',
      deduction_type_id: 'dt-1',
      gross_amount: 100000,
      withheld_amount: 10000,
      lines: [
        { chart_account_id: 'ca-1', debit: 10000, credit: 0, description: 'Tax expense' },
        { chart_account_id: 'ca-2', debit: 0, credit: 10000, description: 'Tax payable' },
      ],
    };

    it('throws when fewer than 2 lines', async () => {
      const service = createService(prisma);
      await expect(
        service.createStatutoryDeductionManualEntry({
          ...validDto,
          lines: [{ chart_account_id: 'ca-1', debit: 100, credit: 0 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when debits and credits do not balance', async () => {
      const service = createService(prisma);
      await expect(
        service.createStatutoryDeductionManualEntry({
          ...validDto,
          lines: [
            { chart_account_id: 'ca-1', debit: 100, credit: 0 },
            { chart_account_id: 'ca-2', debit: 0, credit: 50 },
          ],
        }),
      ).rejects.toThrow('Journal entry is not balanced');
    });

    it('throws when deduction_type_id is missing', async () => {
      const service = createService(prisma);
      await expect(
        service.createStatutoryDeductionManualEntry({
          ...validDto,
          deduction_type_id: '',
        }),
      ).rejects.toThrow('deduction_type_id is required');
    });

    it('throws when gross_amount is zero', async () => {
      const service = createService(prisma);
      await expect(
        service.createStatutoryDeductionManualEntry({
          ...validDto,
          gross_amount: 0,
        }),
      ).rejects.toThrow('gross_amount must be positive');
    });

    it('throws when withheld_amount exceeds gross_amount', async () => {
      const service = createService(prisma);
      await expect(
        service.createStatutoryDeductionManualEntry({
          ...validDto,
          gross_amount: 10000,
          withheld_amount: 20000,
        }),
      ).rejects.toThrow('withheld_amount cannot exceed gross_amount');
    });

    it('throws when deduction type not found', async () => {
      prisma.financeDeductionType.findUnique.mockResolvedValue(null);
      const service = createService(prisma);

      await expect(
        service.createStatutoryDeductionManualEntry(validDto),
      ).rejects.toThrow('Invalid deduction_type_id');
    });

    it('creates journal entry with statutory_deduction_manual_entry sourceType', async () => {
      prisma.financeDeductionType.findUnique.mockResolvedValue({ id: 'dt-1', name: 'PAYE' });
      prisma.financeJournalEntry.findUnique.mockResolvedValue({
        id: 'je-new',
        sourceType: 'statutory_deduction_manual_entry',
        lines: [],
      });

      const service = createService(prisma);
      (service).ensureReportingPeriod = jest.fn().mockResolvedValue({ id: 'rp-1' });
      (service).createJournalEntry = jest.fn().mockResolvedValue({ id: 'je-new' });

      const result = await service.createStatutoryDeductionManualEntry(validDto, 'user-1');

      expect((service).createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'statutory_deduction_manual_entry',
          memo: expect.stringContaining('PAYE'),
        }),
      );
      expect(prisma.financeJournalEntry.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'je-new' } }),
      );
    });
  });
});
