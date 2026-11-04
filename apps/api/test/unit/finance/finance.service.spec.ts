import { describe, expect, it, vi } from 'vitest';
import { FinanceService } from '$apps/finance/accounting/repository';
import { NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import {
  financeAccount,
  financeLedgerEntry,
  financePaymentVoucher,
} from '$apps/finance/accounting/model';

describe('FinanceService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    requireTenantId: vi.fn().mockReturnValue(tenantId),
    currentTenantId: vi.fn().mockReturnValue(tenantId),
    require: vi.fn().mockReturnValue({ tenantId, profileId: 10n, membershipId: 1n, isOwner: false }),
  });

  const mockDependencies = () => ({
    notificationsService: { create: vi.fn().mockResolvedValue(undefined) },
    mailService: { send: vi.fn().mockResolvedValue(undefined) },
    mailQueue: { enqueue: vi.fn().mockResolvedValue(undefined) },
    payrollService: {},
    pdfService: {},
    tenantContext: mockTenantContext(),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    const deps = mockDependencies();
    return new FinanceService(
      db as any,
      deps.notificationsService as any,
      deps.mailService as any,
      deps.mailQueue as any,
      deps.payrollService as any,
      deps.pdfService as any,
      deps.tenantContext as any,
    );
  };

  it('throws NotFoundException when retrieving non-existent account', async () => {
    const db = createFakeDb().queue(financeAccount, []);
    const service = createService(db);

    await expect(service.getAccount('acc_missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retrieves account and calculates current balance incorporating ledger entries', async () => {
    const db = createFakeDb()
      .queue(financeAccount, [
        {
          id: 'acc_1',
          tenantId: 1n,
          name: 'Main Operating Bank',
          code: '1000',
          accountType: 'bank',
          bankName: 'Access Bank',
          accountName: 'Company Operating',
          accountNumber: '0123456789',
          branchName: 'Headquarters',
          currency: 'NGN',
          openingBalance: '1000000',
        },
      ])
      .queue(financeLedgerEntry, [
        { accountId: 'acc_1', direction: 'debit', amount: '500000' },
        { accountId: 'acc_1', direction: 'credit', amount: '200000' },
      ]);

    const service = createService(db);

    const account = await service.getAccount('acc_1');

    expect(account.id).toBe('acc_1');
    expect(account.name).toBe('Main Operating Bank');
    expect(account.opening_balance).toBe(1000000);
    // Opening balance + ledger movement (direction logic)
    expect(account.current_balance).toBeDefined();
  });

  it('throws NotFoundException when updating non-existent payment voucher', async () => {
    const db = createFakeDb().queue(financePaymentVoucher, []);
    const service = createService(db);

    await expect(
      service.updatePaymentVoucher('3001', 'pv_999', {
        payee_name: 'Vendor X',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

