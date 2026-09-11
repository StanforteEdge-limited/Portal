import { Injectable } from '@nestjs/common';
import { DrizzleService } from '$common/drizzle/drizzle.service';

@Injectable()
export class VersionService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getVersionConfig(platform: string, moduleName: string) {
    const config = await this.drizzle.systemVersion.findUnique({
      where: {
        platform_module: {
          platform,
          module: moduleName,
        },
      },
    });

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
