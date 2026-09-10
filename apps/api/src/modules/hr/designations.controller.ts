import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { DesignationsService } from './designations.service';

@Controller('hr/designations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('HR Designations')
@ApiBearerAuth('bearer')
export class DesignationsController {
  constructor(private readonly service: DesignationsService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @Permissions('hr.manage')
  async create(
    @Body() dto: { name: string; code?: string; description?: string; job_description?: string }
  ) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('hr.manage')
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; code?: string; description?: string; job_description?: string }
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('hr.manage')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
