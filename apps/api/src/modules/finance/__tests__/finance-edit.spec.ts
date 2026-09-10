import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinanceService } from '../finance.service';
import { DeductionService } from '../deduction.service';

function createFinanceService(prisma: any) {
  return new FinanceService(prisma, {} as any, {} as any, {} as any);
}

function createDeductionService(prisma: any) {
  return new DeductionService(prisma, {} as any);
}

describe('FinanceService — journal entry updates', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      financeJournalEntry: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      financeJournalLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      financeReportingPeriod: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rp-1' }),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    jest.clearAllMocks();
  });

  it('throws NotFoundException when entry not found', async () => {
    prisma.financeJournalEntry.findUnique.mockResolvedValue(null);
    const service = createFinanceService(prisma);
    await expect(
      service.updateManualJournalEntry('nonexistent', {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for non-manual source types', async () => {
    prisma.financeJournalEntry.findUnique.mockResolvedValue({
      id: 'je-1', sourceType: 'finance_income', lines: [],
    });
    const service = createFinanceService(prisma);
    await expect(
      service.updateManualJournalEntry('je-1', { memo: 'test' }),
    ).rejects.toThrow('Only manual entries can be edited');
  });

  it('allows editing statutory_deduction_manual_entry source type', async () => {
    prisma.financeJournalEntry.findUnique
      .mockResolvedValueOnce({
        id: 'je-1', sourceType: 'statutory_deduction_manual_entry', entryDate: new Date(),
        memo: 'old', currency: 'NGN', lines: [
          { chartAccountId: 'a', organizationId: null, teamId: null, fundId: null, grantId: null, debit: 100, credit: 0, description: '' },
          { chartAccountId: 'b', organizationId: null, teamId: null, fundId: null, grantId: null, debit: 0, credit: 100, description: '' },
        ],
      })
      .mockResolvedValueOnce({
        id: 'je-1', sourceType: 'statutory_deduction_manual_entry', memo: 'updated',
        lines: [{ chartAccount: { id: 'a', code: '100', name: 'Cash' } }],
      });

    const service = createFinanceService(prisma);
    const result = await service.updateManualJournalEntry('je-1', {
      memo: 'updated',
      lines: [
        { chart_account_id: 'a', debit: 200, credit: 0 },
        { chart_account_id: 'b', debit: 0, credit: 200 },
      ],
    });

    expect(prisma.financeJournalLine.deleteMany).toHaveBeenCalledWith({ where: { journalEntryId: 'je-1' } });
    expect(prisma.financeJournalEntry.update).toHaveBeenCalled();
  });

  it('updates memo and lines for manual entry', async () => {
    prisma.financeJournalEntry.findUnique
      .mockResolvedValueOnce({
        id: 'je-1', sourceType: 'manual_entry', entryDate: new Date(),
        memo: 'old', currency: 'NGN', lines: [
          { chartAccountId: 'a', organizationId: null, teamId: null, fundId: null, grantId: null, debit: 100, credit: 0, description: '' },
          { chartAccountId: 'b', organizationId: null, teamId: null, fundId: null, grantId: null, debit: 0, credit: 100, description: '' },
        ],
      })
      .mockResolvedValueOnce({
        id: 'je-1', sourceType: 'manual_entry', memo: 'updated',
        lines: [{ chartAccount: { id: 'a', code: '100', name: 'Cash' } }],
      });

    const service = createFinanceService(prisma);
    await service.updateManualJournalEntry('je-1', {
      memo: 'updated',
      lines: [
        { chart_account_id: 'a', debit: 200, credit: 0 },
        { chart_account_id: 'b', debit: 0, credit: 200 },
      ],
    });

    expect(prisma.financeJournalLine.deleteMany).toHaveBeenCalledWith({ where: { journalEntryId: 'je-1' } });
    expect(prisma.financeJournalEntry.update).toHaveBeenCalled();
  });

  it('throws BadRequestException when entry is not balanced', async () => {
    prisma.financeJournalEntry.findUnique.mockResolvedValue({
      id: 'je-1', sourceType: 'manual_entry', entryDate: new Date(),
      memo: 'old', currency: 'NGN', lines: [],
    });
    const service = createFinanceService(prisma);
    await expect(
      service.updateManualJournalEntry('je-1', {
        lines: [
          { chart_account_id: 'a', debit: 100, credit: 0 },
          { chart_account_id: 'b', debit: 0, credit: 50 },
        ],
      }),
    ).rejects.toThrow('Journal entry is not balanced');
  });

  it('throws BadRequestException when fewer than two lines', async () => {
    prisma.financeJournalEntry.findUnique.mockResolvedValue({
      id: 'je-1', sourceType: 'manual_entry', entryDate: new Date(),
      memo: 'old', currency: 'NGN', lines: [],
    });
    const service = createFinanceService(prisma);
    await expect(
      service.updateManualJournalEntry('je-1', {
        lines: [
          { chart_account_id: 'a', debit: 100, credit: 0 },
        ],
      }),
    ).rejects.toThrow('At least two journal lines are required');
  });
});

describe('DeductionService — deduction updates', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      financeRequestDeduction: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      financeDeductionType: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    jest.clearAllMocks();
  });

  it('throws NotFoundException when deduction not found', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue(null);
    const service = createDeductionService(prisma);
    await expect(
      service.updatePendingDeduction('nonexistent', {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when deduction is not pending', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'remitted',
    });
    const service = createDeductionService(prisma);
    await expect(
      service.updatePendingDeduction('d-1', { amount: 500 }),
    ).rejects.toThrow('Only pending deductions can be edited');
  });

  it('updates pending deduction fields', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'pending',
    });
    prisma.financeRequestDeduction.update.mockResolvedValue({
      id: 'd-1', status: 'pending', amount: 500,
    });

    const service = createDeductionService(prisma);
    await service.updatePendingDeduction('d-1', { amount: 500, notes: 'corrected' });

    expect(prisma.financeRequestDeduction.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { amount: 500, notes: 'corrected' },
    });
  });

  it('validates deduction_type_id exists', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'pending',
    });
    prisma.financeDeductionType.findUnique.mockResolvedValue(null);

    const service = createDeductionService(prisma);
    await expect(
      service.updatePendingDeduction('d-1', { deduction_type_id: 'invalid' }),
    ).rejects.toThrow('Invalid deduction_type_id');
  });

  it('throws NotFoundException for remittance update on missing deduction', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue(null);
    const service = createDeductionService(prisma);
    await expect(
      service.updateRemittanceRecord('nonexistent', { remittance_ref: 'new' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when non-remitted deduction update attempted via remittance method', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'pending',
    });
    const service = createDeductionService(prisma);
    await expect(
      service.updateRemittanceRecord('d-1', { remittance_ref: 'new' }),
    ).rejects.toThrow('Only remitted deductions can be edited');
  });

  it('updates remittance record fields', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'remitted',
    });
    prisma.financeRequestDeduction.update.mockResolvedValue({});

    const service = createDeductionService(prisma);
    await service.updateRemittanceRecord('d-1', {
      remittance_ref: 'FIRS/2026/Q1',
      notes: 'updated ref',
    });

    expect(prisma.financeRequestDeduction.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { remittanceRef: 'FIRS/2026/Q1', notes: 'updated ref' },
    });
  });

  it('updates remittance date correctly', async () => {
    prisma.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'remitted',
    });
    prisma.financeRequestDeduction.update.mockResolvedValue({});

    const service = createDeductionService(prisma);
    const dateStr = '2026-07-15';
    await service.updateRemittanceRecord('d-1', { remitted_at: dateStr });

    expect(prisma.financeRequestDeduction.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { remittedAt: new Date(dateStr) },
    });
  });
});
