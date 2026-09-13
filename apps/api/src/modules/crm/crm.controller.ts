import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { UpsertCrmAccountDto } from './dto/upsert-account.dto';
import { UpsertCrmActivityDto } from './dto/upsert-activity.dto';
import { UpsertCrmContactDto } from './dto/upsert-contact.dto';
import { UpsertCrmLeadDto } from './dto/upsert-lead.dto';
import { UpsertCrmOpportunityDto } from './dto/upsert-opportunity.dto';
import { ReplaceCrmPipelineStagesDto, UpsertCrmPipelineDto } from './dto/upsert-pipeline.dto';
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('CRM')
@ApiBearerAuth('bearer')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('accounts')
  @Permissions('users.view')
  listAccounts(@Query() query: Record<string, any>) {
    return this.crmService.listAccounts(query);
  }

  @Post('accounts')
  @Permissions('users.manage')
  createAccount(@Body() dto: UpsertCrmAccountDto) {
    return this.crmService.createAccount(dto);
  }

  @Get('accounts/:id')
  @Permissions('users.view')
  getAccount(@Param('id') id: string) {
    return this.crmService.getAccount(id);
  }

  @Patch('accounts/:id')
  @Permissions('users.manage')
  updateAccount(@Param('id') id: string, @Body() dto: UpsertCrmAccountDto) {
    return this.crmService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @Permissions('users.manage')
  deleteAccount(@Param('id') id: string) {
    return this.crmService.deleteAccount(id);
  }

  @Get('contacts')
  @Permissions('users.view')
  listContacts(@Query() query: Record<string, any>) {
    return this.crmService.listContacts(query);
  }

  @Post('contacts')
  @Permissions('users.manage')
  createContact(@Body() dto: UpsertCrmContactDto) {
    return this.crmService.createContact(dto);
  }

  @Get('contacts/:id')
  @Permissions('users.view')
  getContact(@Param('id') id: string) {
    return this.crmService.getContact(id);
  }

  @Patch('contacts/:id')
  @Permissions('users.manage')
  updateContact(@Param('id') id: string, @Body() dto: UpsertCrmContactDto) {
    return this.crmService.updateContact(id, dto);
  }

  @Delete('contacts/:id')
  @Permissions('users.manage')
  deleteContact(@Param('id') id: string) {
    return this.crmService.deleteContact(id);
  }

  @Get('leads')
  @Permissions('users.view')
  listLeads(@Query() query: Record<string, any>) {
    return this.crmService.listLeads(query);
  }

  @Post('leads')
  @Permissions('users.manage')
  createLead(@Body() dto: UpsertCrmLeadDto) {
    return this.crmService.createLead(dto);
  }

  @Get('leads/:id')
  @Permissions('users.view')
  getLead(@Param('id') id: string) {
    return this.crmService.getLead(id);
  }

  @Patch('leads/:id')
  @Permissions('users.manage')
  updateLead(@Param('id') id: string, @Body() dto: UpsertCrmLeadDto) {
    return this.crmService.updateLead(id, dto);
  }

  @Delete('leads/:id')
  @Permissions('users.manage')
  deleteLead(@Param('id') id: string) {
    return this.crmService.deleteLead(id);
  }

  @Post('leads/:id/convert')
  @Permissions('users.manage')
  convertLead(@Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.crmService.convertLead(id, dto);
  }

  @Get('pipelines')
  @Permissions('users.view')
  listPipelines() {
    return this.crmService.listPipelines();
  }

  @Post('pipelines')
  @Permissions('users.manage')
  createPipeline(@Body() dto: UpsertCrmPipelineDto) {
    return this.crmService.createPipeline(dto);
  }

  @Get('pipelines/:id')
  @Permissions('users.view')
  getPipeline(@Param('id') id: string) {
    return this.crmService.getPipeline(id);
  }

  @Patch('pipelines/:id')
  @Permissions('users.manage')
  updatePipeline(@Param('id') id: string, @Body() dto: UpsertCrmPipelineDto) {
    return this.crmService.updatePipeline(id, dto);
  }

  @Delete('pipelines/:id')
  @Permissions('users.manage')
  deletePipeline(@Param('id') id: string) {
    return this.crmService.deletePipeline(id);
  }

  @Post('pipelines/:id/stages')
  @Permissions('users.manage')
  replacePipelineStages(@Param('id') id: string, @Body() dto: ReplaceCrmPipelineStagesDto) {
    return this.crmService.replacePipelineStages(id, dto);
  }

  @Get('opportunities')
  @Permissions('users.view')
  listOpportunities(@Query() query: Record<string, any>) {
    return this.crmService.listOpportunities(query);
  }

  @Post('opportunities')
  @Permissions('users.manage')
  createOpportunity(@Body() dto: UpsertCrmOpportunityDto) {
    return this.crmService.createOpportunity(dto);
  }

  @Get('opportunities/:id')
  @Permissions('users.view')
  getOpportunity(@Param('id') id: string) {
    return this.crmService.getOpportunity(id);
  }

  @Patch('opportunities/:id')
  @Permissions('users.manage')
  updateOpportunity(@Param('id') id: string, @Body() dto: UpsertCrmOpportunityDto) {
    return this.crmService.updateOpportunity(id, dto);
  }

  @Delete('opportunities/:id')
  @Permissions('users.manage')
  deleteOpportunity(@Param('id') id: string) {
    return this.crmService.deleteOpportunity(id);
  }

  @Get('activities')
  @Permissions('users.view')
  listActivities(@Query() query: Record<string, any>) {
    return this.crmService.listActivities(query);
  }

  @Post('activities')
  @Permissions('users.manage')
  createActivity(@Body() dto: UpsertCrmActivityDto, @Req() req: any) {
    return this.crmService.createActivity(dto, req.user?.id);
  }

  @Get('activities/:id')
  @Permissions('users.view')
  getActivity(@Param('id') id: string) {
    return this.crmService.getActivity(id);
  }

  @Patch('activities/:id')
  @Permissions('users.manage')
  updateActivity(@Param('id') id: string, @Body() dto: UpsertCrmActivityDto) {
    return this.crmService.updateActivity(id, dto);
  }

  @Delete('activities/:id')
  @Permissions('users.manage')
  deleteActivity(@Param('id') id: string) {
    return this.crmService.deleteActivity(id);
  }
}