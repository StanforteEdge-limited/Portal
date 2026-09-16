import { HealthService } from '$modules/platform/health/health.service';

describe('HealthService', () => {
  const db: any = { client: { execute: jest.fn() } };
  const locks: any = { ping: jest.fn() };

  const service = new HealthService(db, locks);

  beforeEach(() => jest.clearAllMocks());

  describe('ready', () => {
    it('returns ok when database and redis are up', async () => {
      db.client.execute.mockResolvedValue([]);
      locks.ping.mockResolvedValue(true);

      const result = await service.ready();

      expect(result.status).toBe('ok');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.database.latency_ms).toBeGreaterThanOrEqual(0);
      expect(result.checks.redis.status).toBe('up');
      expect(result.checks.storage.driver).toBe('s3');
      expect(result.timestamp).toBeDefined();
    });

    it('returns degraded when database is down', async () => {
      db.client.execute.mockRejectedValue(new Error('connection refused'));
      locks.ping.mockResolvedValue(true);

      const result = await service.ready();

      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.latency_ms).toBeUndefined();
      expect(result.checks.redis.status).toBe('up');
    });

    it('returns degraded when redis is down', async () => {
      db.client.execute.mockResolvedValue([]);
      locks.ping.mockResolvedValue(false);

      const result = await service.ready();

      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.redis.status).toBe('down');
    });

    it('returns degraded when both database and redis are down', async () => {
      db.client.execute.mockRejectedValue(new Error('timeout'));
      locks.ping.mockResolvedValue(false);

      const result = await service.ready();

      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.redis.status).toBe('down');
    });

    it('calls db.client.execute with select 1', async () => {
      db.client.execute.mockResolvedValue([]);
      locks.ping.mockResolvedValue(true);

      await service.ready();

      expect(db.client.execute).toHaveBeenCalledTimes(1);
    });

    it('calls locks.ping', async () => {
      db.client.execute.mockResolvedValue([]);
      locks.ping.mockResolvedValue(true);

      await service.ready();

      expect(locks.ping).toHaveBeenCalledTimes(1);
    });
  });
});
