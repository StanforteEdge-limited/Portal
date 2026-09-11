import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiTags('Analytics')
@ApiBearerAuth('bearer')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('events')
  list(@CurrentTenant() tenant: TenantContext, @Query('name') name?: string) {
    return this.analytics.list(tenant, name);
  }
}
