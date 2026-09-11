import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { TenancyService } from './tenancy.service';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';
import { toBigInt } from '$common/utils/ids';

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

  @Get('members')
  @Permissions('admin.users.manage')
  members(@CurrentTenant() tenant: TenantContext) {
    return this.tenancyService.listMembers(tenant);
  }

  @Delete('members/:profileId')
  @Permissions('admin.users.manage')
  removeMember(@CurrentTenant() tenant: TenantContext, @Param('profileId') profileId: string) {
    return this.tenancyService.deactivateMember(tenant, toBigInt(profileId));
  }
}
