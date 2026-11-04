import { describe, expect, it, vi } from 'vitest';
import { CacheService } from '$core/cache';

describe('CacheService (unit)', () => {
  describe('graceful degradation when Redis is absent', () => {
    it('behaves safely and does not throw on operations', async () => {
      const cache = new CacheService(undefined);
      await cache.connect();

      expect(cache.isConnected).toBe(false);
      expect(await cache.get('any-key')).toBeUndefined();
      await expect(cache.set('any-key', { a: 1 })).resolves.toBeUndefined();
      await expect(cache.del('any-key')).resolves.toBeUndefined();
      await expect(cache.clear()).resolves.toBeUndefined();
      expect(await cache.ttl('any-key')).toBe(0);
    });
  });

  describe('active operations with Redis client', () => {
    const buildConnectedCache = async (overrides: Record<string, any> = {}) => {
      const storage = new Map<string, string>();
      const mockClient = {
        status: 'ready',
        on: vi.fn(),
        ping: vi.fn().mockResolvedValue('PONG'),
        get: vi.fn().mockImplementation(async (key: string) => storage.get(key) ?? null),
        set: vi.fn().mockImplementation(async (key: string, val: string) => {
          storage.set(key, val);
          return 'OK';
        }),
        del: vi.fn().mockImplementation(async (...keys: string[]) => {
          for (const k of keys) storage.delete(k);
          return keys.length;
        }),
        ttl: vi.fn().mockResolvedValue(120),
        ...overrides,
      } as any;

      const cache = new CacheService(mockClient);
      await cache.connect();
      return { cache, mockClient, storage };
    };

    it('sets and gets serialized values including BigInt IDs', async () => {
      const { cache, mockClient } = await buildConnectedCache();

      const complexPayload = {
        tenantId: 42n,
        title: 'Report',
        count: 5,
        items: [{ id: 100n, label: 'first' }],
      };

      await cache.set('reports:summary', complexPayload, 120);

      expect(mockClient.set).toHaveBeenCalledWith(
        'portal:cache:reports:summary',
        expect.any(String),
        'EX',
        120,
      );

      const retrieved = await cache.get<typeof complexPayload>('reports:summary');

      expect(retrieved).toBeDefined();
      expect(retrieved?.tenantId).toBe(42n);
      expect(retrieved?.items[0].id).toBe(100n);
      expect(retrieved?.title).toBe('Report');
      expect(retrieved?.count).toBe(5);
    });

    it('removes keys using prefixed names', async () => {
      const { cache, mockClient } = await buildConnectedCache();

      await cache.del('my-key');
      expect(mockClient.del).toHaveBeenCalledWith('portal:cache:my-key');

      const remainingTtl = await cache.ttl('my-key');
      expect(remainingTtl).toBe(120);
      expect(mockClient.ttl).toHaveBeenCalledWith('portal:cache:my-key');
    });

    it('clears only prefixed cache keys using SCAN', async () => {
      const { cache, mockClient } = await buildConnectedCache({
        scan: vi
          .fn()
          .mockResolvedValueOnce(['10', ['portal:cache:k1', 'portal:cache:k2']])
          .mockResolvedValueOnce(['0', ['portal:cache:k3']]),
      });

      await cache.clear();

      expect(mockClient.scan).toHaveBeenCalledTimes(2);
      expect(mockClient.del).toHaveBeenCalledWith('portal:cache:k1', 'portal:cache:k2');
      expect(mockClient.del).toHaveBeenCalledWith('portal:cache:k3');
    });

    it('swallows errors gracefully if Redis client throws during get/set', async () => {
      const { cache } = await buildConnectedCache({
        get: vi.fn().mockRejectedValue(new Error('Connection reset')),
        set: vi.fn().mockRejectedValue(new Error('Out of memory')),
      });

      // Does not crash calling code; returns undefined and logs warning
      expect(await cache.get('fail-key')).toBeUndefined();
      await expect(cache.set('fail-key', 'value')).resolves.toBeUndefined();
    });
  });
});
