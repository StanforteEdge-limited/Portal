import { describe, expect, it } from 'vitest';
import { BadRequestException, UnauthorizedException } from '$core/errors';
import { AuditService } from '$apps/identity/audit/repository';
import { auditEvent } from '$apps/identity/audit/model';
import { createFakeDb } from '../../../support/fake-db';

function buildService(db: ReturnType<typeof createFakeDb>, tenantId?: bigint) {
  return new AuditService(db as any, {
    currentTenantId: () => tenantId,
    get: () => (tenantId ? { tenantId } : undefined),
  } as any);
}

describe('AuditService (unit, fake db)', () => {
  it('requires tenant context for audit reads', async () => {
    const audit = buildService(createFakeDb());

    await expect(audit.listEvents({})).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid date filters before querying', async () => {
    const audit = buildService(createFakeDb(), 1n);

    await expect(audit.listEvents({ from: 'not-a-date' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates tenant-scoped audit events with actor id', async () => {
    const createdAt = new Date();
    const db = createFakeDb().insertReturning(auditEvent, {
      id: 'audit-1',
      tenantId: 1n,
      userId: 7n,
      entityType: 'profile',
      entityId: '7',
      action: 'updated',
      comment: 'Changed name',
      data: { field: 'first_name' },
      createdAt,
    });
    const audit = buildService(db, 1n);

    const res = await audit.createEvent(
      {
        entity_type: 'profile',
        entity_id: '7',
        action: 'updated',
        comment: 'Changed name',
        data: { field: 'first_name' },
      },
      '7',
    );

    expect(res).toMatchObject({
      id: 'audit-1',
      entity_type: 'profile',
      entity_id: '7',
      action: 'updated',
      performed_by: '7',
    });
    expect(db.inserts.some((entry) => entry.table === auditEvent)).toBe(true);
  });
});
