import { describe, expect, it } from 'vitest';
import { DesignationsService } from '$apps/hr/designations/repository';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { designation } from '$apps/hr/designations/model';

describe('DesignationsService (unit, fake db)', () => {
  it('throws BadRequestException if designation name is missing', async () => {
    const db = createFakeDb();
    const service = new DesignationsService(db as any);

    await expect(service.create({ name: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when retrieving non-existent designation', async () => {
    const db = createFakeDb().queue(designation, []);
    const service = new DesignationsService(db as any);

    await expect(service.get('999')).rejects.toBeInstanceOf(NotFoundException);
  });
});
