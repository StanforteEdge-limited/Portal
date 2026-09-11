import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CreateAdminUserDto } from '$modules/auth/admin/dto/create-admin-user.dto';
import { UpdateAdminUserDto } from '$modules/auth/admin/dto/update-admin-user.dto';
import { UpdateUserStatusDto } from '$modules/auth/admin/dto/update-user-status.dto';
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
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Post('bulk')
  createBulk(@Body() dto: { users: CreateAdminUserDto[] }) {
    return this.adminService.createBulkUsers(dto.users);
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Post(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateStatus(id, dto);
  }
}
