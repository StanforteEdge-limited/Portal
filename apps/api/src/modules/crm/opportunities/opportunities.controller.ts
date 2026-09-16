import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CrmOpportunitiesService } from './opportunities.service';
import { UpsertCrmOpportunityDto } from './dto/upsert-opportunity.dto';

@Controller('crm/opportunities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('CRM Opportunities')
@ApiBearerAuth('bearer')
export class CrmOpportunitiesController {
  constructor(private readonly opportunitiesService: CrmOpportunitiesService) {}

  @Get()
  @Permissions('users.view')
  list(@Query() query: Record<string, any>) {
    return this.opportunitiesService.listOpportunities(query);
  }

  @Post()
  @Permissions('users.manage')
  create(@Body() dto: UpsertCrmOpportunityDto) {
    return this.opportunitiesService.createOpportunity(dto);
  }

  @Get(':id')
  @Permissions('users.view')
  get(@Param('id') id: string) {
    return this.opportunitiesService.getOpportunity(id);
  }

  @Patch(':id')
  @Permissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpsertCrmOpportunityDto) {
    return this.opportunitiesService.updateOpportunity(id, dto);
  }

  @Delete(':id')
  @Permissions('users.manage')
  delete(@Param('id') id: string) {
    return this.opportunitiesService.deleteOpportunity(id);
  }
}
