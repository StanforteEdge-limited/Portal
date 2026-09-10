import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VersionService } from './version.service';

@Controller('version')
@ApiTags('Version')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve system version parameters' })
  @ApiQuery({ name: 'platform', required: true, type: String })
  @ApiQuery({ name: 'module', required: true, type: String })
  async getVersion(
    @Query('platform') platform: string,
    @Query('module') module: string,
  ) {
    return this.versionService.getVersionConfig(platform, module);
  }
}
