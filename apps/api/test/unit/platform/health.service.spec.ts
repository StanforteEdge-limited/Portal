import { describe, expect, it, vi } from 'vitest';
import { HealthService } from '$apps/platform/health/repository';
import { createFakeDb } from '../../support/fake-db';

describe('HealthService (unit)', () => {
  it('returns ok status when both database and redis are healthy', async () => {
    const db = createFakeDb();
    const locks = { ping: vi.fn().mockResolvedValue(true) } as any;
    const service = new HealthService(db as any, locks);

    const report = await service.ready();

    expect(report.status).toBe('ok');
    expect(report.database).toBe('up');
    expect(report.redis).toBe('up');
    expect(report.checks).toEqual({ database: true, redis: true });
    expect(typeof report.uptime).toBe('number');
    expect(typeof report.timestamp).toBe('string');
  });

  it('returns degraded status when database is down', async () => {
    const db = createFakeDb();
    db.client.execute = vi.fn().mockRejectedValue(new Error('DB connection refused'));
    const locks = { ping: vi.fn().mockResolvedValue(true) } as any;
    const service = new HealthService(db as any, locks);

    const report = await service.ready();

    expect(report.status).toBe('degraded');
    expect(report.database).toBe('down');
    expect(report.redis).toBe('up');
    expect(report.checks.database).toBe(false);
  });

  it('returns degraded status when redis is down', async () => {
    const db = createFakeDb();
    const locks = { ping: vi.fn().mockResolvedValue(false) } as any;
    const service = new HealthService(db as any, locks);

    const report = await service.ready();

    expect(report.status).toBe('degraded');
    expect(report.database).toBe('up');
    expect(report.redis).toBe('down');
    expect(report.checks.redis).toBe(false);
  });

  it('returns degraded status when both database and redis are down', async () => {
    const db = createFakeDb();
    db.client.execute = vi.fn().mockRejectedValue(new Error('Connection error'));
    const locks = { ping: vi.fn().mockResolvedValue(false) } as any;
    const service = new HealthService(db as any, locks);

    const report = await service.ready();

    expect(report.status).toBe('degraded');
    expect(report.database).toBe('down');
    expect(report.redis).toBe('down');
    expect(report.checks).toEqual({ database: false, redis: false });
  });
});
