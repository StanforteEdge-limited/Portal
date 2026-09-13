import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { TenancyService } from './tenancy.service';
import { WorkspaceService } from './workspace.service';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';
import { toBigInt } from '$common/utils/ids';
import { InviteTenantMemberDto } from './dto/invite-tenant-member.dto';
import { AssignTenantRolesDto } from './dto/assign-tenant-roles.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { DecommissionTenantDto } from './dto/decommission-tenant.dto';

@Controller('tenancy')
@ApiTags('Tenancy')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenancyController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Get('coverage')
  @Permissions('admin.users.manage')
  coverage(@CurrentTenant() tenant: TenantContext) {
    if (!tenant.isOwner) {
      throw new ForbiddenException('Only tenant owners can audit tenant coverage');
    }
    return this.tenancyService.auditTenantCoverage(tenant);
  }

  @Post('workspace/bootstrap')
  @Permissions('admin.users.manage')
  bootstrapDefaults(@CurrentTenant() tenant: TenantContext) {
    if (!tenant.isOwner) {
      throw new ForbiddenException('Only tenant owners can bootstrap workspace defaults');
    }
    return this.workspaceService.bootstrapDefaults(tenant);
  }

  @Get('current')
  @Permissions('admin.users.manage')
  current(@CurrentTenant() tenant: TenantContext) {
    return this.tenancyService.getTenant(tenant);
  }

  @Patch('current')
  @Permissions('admin.users.manage')
  update(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateTenantDto) {
    return this.tenancyService.updateTenant(tenant, dto);
  }

  @Post('current/suspend')
  @Permissions('admin.users.manage')
  suspend(@CurrentTenant() tenant: TenantContext) {
    return this.tenancyService.setTenantStatus(tenant, 'suspended');
  }

  @Post('current/reactivate')
  @Permissions('admin.users.manage')
  reactivate(@CurrentTenant() tenant: TenantContext) {
    return this.tenancyService.setTenantStatus(tenant, 'active');
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

  @Post('current/ownership')
  @Permissions('admin.users.manage')
  transferOwnership(@CurrentTenant() tenant: TenantContext, @Body() dto: TransferOwnershipDto) {
    return this.tenancyService.transferOwnership(tenant, toBigInt(dto.profile_id));
  }

  @Get('current/export')
  @Permissions('admin.users.manage')
  exportTenantData(@CurrentTenant() tenant: TenantContext) {
    return this.tenancyService.exportTenantData(tenant);
  }

  @Post('current/decommission')
  @Permissions('admin.users.manage')
  decommissionTenant(@CurrentTenant() tenant: TenantContext, @Body() dto: DecommissionTenantDto) {
    return this.tenancyService.decommissionTenant(tenant, dto.confirm);
  }
}
