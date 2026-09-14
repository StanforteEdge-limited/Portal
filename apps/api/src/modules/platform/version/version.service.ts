import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { systemVersion } from './model';

@Injectable()
export class VersionService {
  constructor(private readonly db: DbService) {}

  async getVersionConfig(platform: string, moduleName: string) {
    const [config] = await this.db.client
      .select()
      .from(systemVersion)
      .where(and(eq(systemVersion.platform, platform), eq(systemVersion.module, moduleName)))
      .limit(1);

    if (!config) {
      // Default fallback when config is not yet seeded
      return {
        platform,
        module: moduleName,
        version: '1.0.0',
        minVersion: '1.0.0',
        forceUpdate: false,
        releaseNotes: [],
      };
    }

    return {
      platform: config.platform,
      module: config.module,
      version: config.version,
      minVersion: config.minVersion,
      forceUpdate: config.forceUpdate,
      releaseNotes: config.releaseNotes || [],
    };
  }
}
