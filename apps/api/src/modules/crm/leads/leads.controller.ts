import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CrmLeadsService } from './leads.service';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { UpsertCrmLeadDto } from './dto/upsert-lead.dto';

@Controller('crm/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('CRM Leads')
@ApiBearerAuth('bearer')
export class CrmLeadsController {
  constructor(private readonly leadsService: CrmLeadsService) {}

  @Get()
  @Permissions('users.view')
  list(@Query() query: Record<string, any>) {
    return this.leadsService.listLeads(query);
  }

  @Post()
  @Permissions('users.manage')
  create(@Body() dto: UpsertCrmLeadDto) {
    return this.leadsService.createLead(dto);
  }

  @Get(':id')
  @Permissions('users.view')
  get(@Param('id') id: string) {
    return this.leadsService.getLead(id);
  }

  @Patch(':id')
  @Permissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpsertCrmLeadDto) {
    return this.leadsService.updateLead(id, dto);
  }

  @Delete(':id')
  @Permissions('users.manage')
  delete(@Param('id') id: string) {
    return this.leadsService.deleteLead(id);
  }

  @Post(':id/convert')
  @Permissions('users.manage')
  convert(@Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.leadsService.convertLead(id, dto);
  }
}
