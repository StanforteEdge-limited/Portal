import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '$apps/analytics/repository';
import { createFakeDb } from '../../support/fake-db';
import { analyticsEvent } from '$apps/analytics/model';

describe('AnalyticsService (unit, fake db)', () => {
  const mockCache = () => ({
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
  });

  it('tracks an analytics event into the database', async () => {
    const db = createFakeDb().insertReturning(analyticsEvent, {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'user.login',
      source: 'web',
      properties: { browser: 'Chrome' },
    });
    const service = new AnalyticsService(db as any, mockCache() as any);

    const event = await service.track({
      name: 'user.login',
      source: 'web',
      properties: { browser: 'Chrome' },
    });

    expect(event.name).toBe('user.login');
    expect(db.inserts.some((i) => i.table === analyticsEvent)).toBe(true);
  });
});
