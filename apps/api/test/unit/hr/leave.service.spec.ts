import { describe, expect, it, vi } from 'vitest';
import { LeaveService } from '$apps/hr/leave/repository';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { leaveBalanceLedger, leaveRequest, leaveType } from '$apps/hr/leave/model';

describe('LeaveService (unit, fake db)', () => {
  const memberContext = {
    tenantId: 1n,
    profileId: 10n,
    membershipId: 1n,
    isOwner: false,
  } as any;

  const ownerContext = {
    tenantId: 1n,
    profileId: 99n,
    membershipId: 2n,
    isOwner: true,
  } as any;

  const mockNotifications = () => ({
    create: vi.fn().mockResolvedValue(undefined),
  });

  it('lists active leave types', async () => {
    const db = createFakeDb().queue(leaveType, [
      { id: 'lt_1', tenantId: 1n, code: 'annual', name: 'Annual Leave', isActive: 1 },
      { id: 'lt_2', tenantId: null, code: 'sick', name: 'Sick Leave', isActive: 1 },
    ]);
    const notifications = mockNotifications();
    const service = new LeaveService(db as any, notifications as any);

    const types = await service.listTypes(memberContext);

    expect(types.length).toBe(2);
    expect(types[0].code).toBe('annual');
  });

  it('prevents non-owners from creating leave types', async () => {
    const db = createFakeDb();
    const service = new LeaveService(db as any, mockNotifications() as any);

    await expect(
      service.createType(memberContext, {
        code: 'paternity',
        name: 'Paternity Leave',
        annual_entitlement_days: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects leave request if leave type is not found', async () => {
    const db = createFakeDb().queue(leaveType, []);
    const service = new LeaveService(db as any, mockNotifications() as any);

    await expect(
      service.createRequest(memberContext, {
        leave_type_id: 'missing-type',
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        reason: 'Holiday vacation',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects leave request if end date is before start date', async () => {
    const db = createFakeDb().queue(leaveType, [
      { id: 'lt_1', tenantId: 1n, code: 'annual', isActive: 1 },
    ]);
    const service = new LeaveService(db as any, mockNotifications() as any);

    await expect(
      service.createRequest(memberContext, {
        leave_type_id: 'lt_1',
        start_date: '2026-12-10',
        end_date: '2026-12-05',
        reason: 'Typo in dates',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects leave request if only weekend days are selected (0 business days)', async () => {
    const db = createFakeDb().queue(leaveType, [
      { id: 'lt_1', tenantId: 1n, code: 'annual', isActive: 1 },
    ]);
    const service = new LeaveService(db as any, mockNotifications() as any);

    // 2026-12-05 is Saturday, 2026-12-06 is Sunday
    await expect(
      service.createRequest(memberContext, {
        leave_type_id: 'lt_1',
        start_date: '2026-12-05',
        end_date: '2026-12-06',
        reason: 'Weekend only',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects leave request if dates overlap existing active request', async () => {
    const db = createFakeDb()
      .queue(leaveType, [{ id: 'lt_1', tenantId: 1n, code: 'annual', isActive: 1 }])
      .queue(leaveRequest, [{ id: 'lr_existing' }]); // overlap check finds row

    const service = new LeaveService(db as any, mockNotifications() as any);

    await expect(
      service.createRequest(memberContext, {
        leave_type_id: 'lt_1',
        start_date: '2026-12-01',
        end_date: '2026-12-04',
        reason: 'Annual leave trip',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates leave request and calculates business days correctly', async () => {
    // 2026-12-01 (Tuesday) to 2026-12-07 (Monday) = 5 working days (Tue, Wed, Thu, Fri, Mon)
    const db = createFakeDb()
      .queue(leaveType, [{ id: 'lt_1', tenantId: 1n, code: 'annual', isActive: 1 }])
      .queue(leaveRequest, []) // overlap check finds nothing
      .insertReturning(leaveRequest, {
        id: 'lr_new',
        tenantId: 1n,
        userId: 10n,
        leaveTypeId: 'lt_1',
        startDate: new Date('2026-12-01T00:00:00.000Z'),
        endDate: new Date('2026-12-07T00:00:00.000Z'),
        days: 5,
        reason: 'Vacation',
        status: 'pending',
      });

    const service = new LeaveService(db as any, mockNotifications() as any);

    const created = await service.createRequest(memberContext, {
      leave_type_id: 'lt_1',
      start_date: '2026-12-01',
      end_date: '2026-12-07',
      reason: 'Vacation',
    });

    expect(created.id).toBe('lr_new');
    expect(created.days).toBe(5);
    expect(db.inserts.some((i) => i.table === leaveRequest && i.values.days === 5)).toBe(true);
  });

  it('reviews and approves leave request with notification dispatch', async () => {
    const db = createFakeDb()
      .queue(leaveRequest, [
        { id: 'lr_1', tenantId: 1n, userId: 10n, status: 'pending' },
      ])
      .insertReturning(leaveRequest, {
        id: 'lr_1',
        tenantId: 1n,
        userId: 10n,
        status: 'approved',
        reviewedBy: 99n,
        reviewNotes: 'Approved by manager',
      });

    const notifications = mockNotifications();
    const service = new LeaveService(db as any, notifications as any);

    const reviewed = await service.review(ownerContext, 'lr_1', {
      status: 'approved',
      notes: 'Approved by manager',
    });

    expect(reviewed.status).toBe('approved');
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10n,
        type: 'leave',
        title: 'Leave request approved',
      }),
    );
  });

  it('calculates leave balances from balance ledger entries', async () => {
    const db = createFakeDb().queue(leaveBalanceLedger, [
      { id: 1n, leaveTypeKey: 'annual', deltaDays: 20 },
      { id: 2n, leaveTypeKey: 'annual', deltaDays: -5 },
      { id: 3n, leaveTypeKey: 'sick', deltaDays: 10 },
      { id: 4n, leaveTypeKey: 'sick', deltaDays: -2 },
    ]);
    const service = new LeaveService(db as any, mockNotifications() as any);

    const balances = await service.balance(memberContext, undefined, 2026);

    expect(balances).toEqual({
      annual: 15,
      sick: 8,
    });
  });
});
