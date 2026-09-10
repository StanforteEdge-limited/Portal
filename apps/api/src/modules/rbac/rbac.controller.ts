import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RbacService } from './rbac.service';

@Controller('admin/rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('settings.manage')
@ApiTags('RBAC')
@ApiBearerAuth('bearer')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  overview(@Query('include_inactive') includeInactive?: string) {
    return this.rbacService.getOverview(includeInactive === 'true');
  }

  @Get('roles')
  listRoles(@Query('include_inactive') includeInactive?: string) {
    return this.rbacService.listRoles(includeInactive === 'true');
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
    @Param('id') id: string,
    @Query('replacement_role_id') replacementRoleId?: string
  ) {
    return this.rbacService.deleteRole(id, replacementRoleId);
  }

  @Get('roles/:id/delete-impact')
  getRoleDeleteImpact(@Param('id') id: string) {
    return this.rbacService.getRoleDeleteImpact(id);
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
  getUserRoles(@Param('profileId') profileId: string) {
    return this.rbacService.getUserRoles(profileId);
  }

  @Post('users/:profileId/roles')
  assignUserRoles(@Param('profileId') profileId: string, @Body() dto: AssignUserRolesDto) {
    return this.rbacService.assignUserRoles(profileId, dto);
  }
}
