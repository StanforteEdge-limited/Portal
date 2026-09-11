import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { TenancyService } from './tenancy.service';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';
import { toBigInt } from '$common/utils/ids';
import { InviteTenantMemberDto } from './dto/invite-tenant-member.dto';
import { AssignTenantRolesDto } from './dto/assign-tenant-roles.dto';

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

  @Post('members/invite')
  @Permissions('admin.users.manage')
  inviteMember(@CurrentTenant() tenant: TenantContext, @Body() dto: InviteTenantMemberDto) {
    return this.tenancyService.inviteMember(tenant, dto.email, dto.message);
  }

  @Post('members/:profileId/roles')
  @Permissions('admin.users.manage')
  assignRoles(
    @CurrentTenant() tenant: TenantContext,
    @Param('profileId') profileId: string,
    @Body() dto: AssignTenantRolesDto,
  ) {
    return this.tenancyService.assignRoles(tenant, toBigInt(profileId), dto.roles);
  }
}
