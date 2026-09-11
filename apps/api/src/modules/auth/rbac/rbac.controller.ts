import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';
import { AssignUserRolesDto } from '$modules/auth/rbac/dto/assign-user-roles.dto';
import { CreateRoleDto } from '$modules/auth/rbac/dto/create-role.dto';
import { SetRolePermissionsDto } from '$modules/auth/rbac/dto/set-role-permissions.dto';
import { UpdateRoleDto } from '$modules/auth/rbac/dto/update-role.dto';
import { RbacService } from './rbac.service';

@Controller('admin/rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('settings.manage')
@ApiTags('RBAC')
@ApiBearerAuth('bearer')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  overview(@CurrentTenant() tenant: TenantContext, @Query('include_inactive') includeInactive?: string) {
    return this.rbacService.getOverview(includeInactive === 'true', tenant);
  }

  @Get('roles')
  listRoles(@CurrentTenant() tenant: TenantContext, @Query('include_inactive') includeInactive?: string) {
    return this.rbacService.listRoles(includeInactive === 'true', tenant);
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Post('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  deleteRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Query('replacement_role_id') replacementRoleId?: string
  ) {
    return this.rbacService.deleteRole(id, replacementRoleId, tenant);
  }

  @Get('roles/:id/delete-impact')
  getRoleDeleteImpact(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.rbacService.getRoleDeleteImpact(id, tenant);
  }

  @Post('roles/:id/permissions')
  setRolePermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto) {
    return this.rbacService.setRolePermissions(id, dto);
  }

  @Get('permissions')
  listPermissions(@Query('module') module?: string, @Query('search') search?: string) {
    return this.rbacService.listPermissions({ module, search });
  }

  @Get('users/:profileId')
  getUserRoles(@CurrentTenant() tenant: TenantContext, @Param('profileId') profileId: string) {
    return this.rbacService.getUserRoles(profileId, tenant);
  }

  @Post('users/:profileId/roles')
  assignUserRoles(
    @CurrentTenant() tenant: TenantContext,
    @Param('profileId') profileId: string,
    @Body() dto: AssignUserRolesDto
  ) {
    return this.rbacService.assignUserRoles(profileId, dto, tenant);
  }
}
