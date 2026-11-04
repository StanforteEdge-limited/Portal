import { describe, expect, it } from 'vitest';
import { VersionService } from '$apps/platform/version/repository';
import { systemVersion } from '$apps/platform/version/model';
import { createFakeDb } from '../../support/fake-db';

describe('VersionService (unit, fake db)', () => {
  it('returns fallback default config when version is not seeded', async () => {
    const db = createFakeDb().queue(systemVersion, []);
    const service = new VersionService(db as any);

    const config = await service.getVersionConfig('web', 'core');

    expect(config).toEqual({
      platform: 'web',
      module: 'core',
      version: '1.0.0',
      minVersion: '1.0.0',
      forceUpdate: false,
      releaseNotes: [],
    });
  });

  it('returns seeded version configuration from the database', async () => {
    const db = createFakeDb().queue(systemVersion, [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        platform: 'mobile',
        module: 'portal',
        version: '2.4.1',
        minVersion: '2.0.0',
        forceUpdate: true,
        releaseNotes: ['Bug fixes', 'Performance improvements'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const service = new VersionService(db as any);

    const config = await service.getVersionConfig('mobile', 'portal');

    expect(config).toEqual({
      platform: 'mobile',
      module: 'portal',
      version: '2.4.1',
      minVersion: '2.0.0',
      forceUpdate: true,
      releaseNotes: ['Bug fixes', 'Performance improvements'],
    });
  });
});

