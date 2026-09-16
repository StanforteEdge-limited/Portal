import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CrmPipelinesService } from './pipelines.service';
import { ReplaceCrmPipelineStagesDto, UpsertCrmPipelineDto } from './dto/upsert-pipeline.dto';

@Controller('crm/pipelines')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('CRM Pipelines')
@ApiBearerAuth('bearer')
export class CrmPipelinesController {
  constructor(private readonly pipelinesService: CrmPipelinesService) {}

  @Get()
  @Permissions('users.view')
  list() {
    return this.pipelinesService.listPipelines();
  }

  @Post()
  @Permissions('users.manage')
  create(@Body() dto: UpsertCrmPipelineDto) {
    return this.pipelinesService.createPipeline(dto);
  }

  @Get(':id')
  @Permissions('users.view')
  get(@Param('id') id: string) {
    return this.pipelinesService.getPipeline(id);
  }

  @Patch(':id')
  @Permissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpsertCrmPipelineDto) {
    return this.pipelinesService.updatePipeline(id, dto);
  }

  @Delete(':id')
  @Permissions('users.manage')
  delete(@Param('id') id: string) {
    return this.pipelinesService.deletePipeline(id);
  }

  @Post(':id/stages')
  @Permissions('users.manage')
  replaceStages(@Param('id') id: string, @Body() dto: ReplaceCrmPipelineStagesDto) {
    return this.pipelinesService.replacePipelineStages(id, dto);
  }
}
