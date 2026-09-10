import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class VersionService {
  constructor(private readonly prisma: PrismaService) {}

  async getVersionConfig(platform: string, moduleName: string) {
    const config = await this.prisma.systemVersion.findUnique({
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
