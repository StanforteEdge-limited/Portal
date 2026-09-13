import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CreateAdminUserDto } from '$modules/identity/admin/dto/create-admin-user.dto';
import { UpdateAdminUserDto } from '$modules/identity/admin/dto/update-admin-user.dto';
import { UpdateUserStatusDto } from '$modules/identity/admin/dto/update-user-status.dto';
import { AdminService } from './admin.service';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('users.manage')
@ApiTags('Admin')
@ApiBearerAuth('bearer')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext, @Query() query: Record<string, any>) {
    return this.adminService.listUsers(query, tenant);
  }

  @Get(':id')
  getUser(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.adminService.getUser(id, tenant);
  }

  @Post()
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto, tenant);
  }

  @Post('bulk')
  createBulk(@CurrentTenant() tenant: TenantContext, @Body() dto: { users: CreateAdminUserDto[] }) {
    return this.adminService.createBulkUsers(dto.users, tenant);
  }

  @Post(':id')
  update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, dto, tenant);
  }

  @Post(':id/status')
  updateStatus(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateStatus(id, dto, tenant);
  }
}
