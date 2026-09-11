import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { TenancyService } from './tenancy.service';

@Controller('tenancy')
@ApiTags('Tenancy')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get('coverage')
  @Permissions('admin.users.manage')
  coverage() {
    return this.tenancyService.auditTenantCoverage();
  }
}
