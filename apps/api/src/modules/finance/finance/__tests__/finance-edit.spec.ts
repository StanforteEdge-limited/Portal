import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinanceService } from '$modules/finance/finance/finance.service';
import { DeductionService } from '$modules/finance/finance/deduction.service';

function createFinanceService(drizzle: any) {
  return new FinanceService({ client: { query: drizzle, transaction: drizzle.$transaction, execute: drizzle.$executeRaw } } as any, {} as any, {} as any, {} as any);
}

function createDeductionService(drizzle: any) {
  return new DeductionService(drizzle, {} as any);
}

describe('FinanceService — journal entry updates', () => {
  let drizzle: any;

  beforeEach(() => {
    drizzle = {
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
      $transaction: jest.fn(async (fn: any) => fn(drizzle)),
    };
    jest.clearAllMocks();
  });

  it('throws NotFoundException when entry not found', async () => {
    drizzle.financeJournalEntry.findUnique.mockResolvedValue(null);
    const service = createFinanceService(drizzle);
    await expect(
      service.updateManualJournalEntry('nonexistent', {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for non-manual source types', async () => {
    drizzle.financeJournalEntry.findUnique.mockResolvedValue({
      id: 'je-1', sourceType: 'finance_income', lines: [],
    });
    const service = createFinanceService(drizzle);
    await expect(
      service.updateManualJournalEntry('je-1', { memo: 'test' }),
    ).rejects.toThrow('Only manual entries can be edited');
  });

  it('allows editing statutory_deduction_manual_entry source type', async () => {
    drizzle.financeJournalEntry.findUnique
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

    const service = createFinanceService(drizzle);
    const result = await service.updateManualJournalEntry('je-1', {
      memo: 'updated',
      lines: [
        { chart_account_id: 'a', debit: 200, credit: 0 },
        { chart_account_id: 'b', debit: 0, credit: 200 },
      ],
    });

    expect(drizzle.financeJournalLine.deleteMany).toHaveBeenCalledWith({ where: { journalEntryId: 'je-1' } });
    expect(drizzle.financeJournalEntry.update).toHaveBeenCalled();
  });

  it('updates memo and lines for manual entry', async () => {
    drizzle.financeJournalEntry.findUnique
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

    const service = createFinanceService(drizzle);
    await service.updateManualJournalEntry('je-1', {
      memo: 'updated',
      lines: [
        { chart_account_id: 'a', debit: 200, credit: 0 },
        { chart_account_id: 'b', debit: 0, credit: 200 },
      ],
    });

    expect(drizzle.financeJournalLine.deleteMany).toHaveBeenCalledWith({ where: { journalEntryId: 'je-1' } });
    expect(drizzle.financeJournalEntry.update).toHaveBeenCalled();
  });

  it('throws BadRequestException when entry is not balanced', async () => {
    drizzle.financeJournalEntry.findUnique.mockResolvedValue({
      id: 'je-1', sourceType: 'manual_entry', entryDate: new Date(),
      memo: 'old', currency: 'NGN', lines: [],
    });
    const service = createFinanceService(drizzle);
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
    drizzle.financeJournalEntry.findUnique.mockResolvedValue({
      id: 'je-1', sourceType: 'manual_entry', entryDate: new Date(),
      memo: 'old', currency: 'NGN', lines: [],
    });
    const service = createFinanceService(drizzle);
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
  let drizzle: any;

  beforeEach(() => {
    drizzle = {
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
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue(null);
    const service = createDeductionService(drizzle);
    await expect(
      service.updatePendingDeduction('nonexistent', {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when deduction is not pending', async () => {
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'remitted',
    });
    const service = createDeductionService(drizzle);
    await expect(
      service.updatePendingDeduction('d-1', { amount: 500 }),
    ).rejects.toThrow('Only pending deductions can be edited');
  });

  it('updates pending deduction fields', async () => {
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'pending',
    });
    drizzle.financeRequestDeduction.update.mockResolvedValue({
      id: 'd-1', status: 'pending', amount: 500,
    });

    const service = createDeductionService(drizzle);
    await service.updatePendingDeduction('d-1', { amount: 500, notes: 'corrected' });

    expect(drizzle.financeRequestDeduction.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { amount: 500, notes: 'corrected' },
    });
  });

  it('validates deduction_type_id exists', async () => {
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'pending',
    });
    drizzle.financeDeductionType.findUnique.mockResolvedValue(null);

    const service = createDeductionService(drizzle);
    await expect(
      service.updatePendingDeduction('d-1', { deduction_type_id: 'invalid' }),
    ).rejects.toThrow('Invalid deduction_type_id');
  });

  it('throws NotFoundException for remittance update on missing deduction', async () => {
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue(null);
    const service = createDeductionService(drizzle);
    await expect(
      service.updateRemittanceRecord('nonexistent', { remittance_ref: 'new' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when non-remitted deduction update attempted via remittance method', async () => {
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'pending',
    });
    const service = createDeductionService(drizzle);
    await expect(
      service.updateRemittanceRecord('d-1', { remittance_ref: 'new' }),
    ).rejects.toThrow('Only remitted deductions can be edited');
  });

  it('updates remittance record fields', async () => {
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'remitted',
    });
    drizzle.financeRequestDeduction.update.mockResolvedValue({});

    const service = createDeductionService(drizzle);
    await service.updateRemittanceRecord('d-1', {
      remittance_ref: 'FIRS/2026/Q1',
      notes: 'updated ref',
    });

    expect(drizzle.financeRequestDeduction.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { remittanceRef: 'FIRS/2026/Q1', notes: 'updated ref' },
    });
  });

  it('updates remittance date correctly', async () => {
    drizzle.financeRequestDeduction.findUnique.mockResolvedValue({
      id: 'd-1', status: 'remitted',
    });
    drizzle.financeRequestDeduction.update.mockResolvedValue({});

    const service = createDeductionService(drizzle);
    const dateStr = '2026-07-15';
    await service.updateRemittanceRecord('d-1', { remitted_at: dateStr });

    expect(drizzle.financeRequestDeduction.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { remittedAt: new Date(dateStr) },
    });
  });
});

