import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminService } from './admin.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('users.manage')
@ApiTags('Admin')
@ApiBearerAuth('bearer')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  list(@Query() query: Record<string, any>) {
    return this.adminService.listUsers(query);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
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
