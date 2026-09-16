import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CrmActivitiesService } from './activities.service';
import { UpsertCrmActivityDto } from './dto/upsert-activity.dto';

@Controller('crm/activities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('CRM Activities')
@ApiBearerAuth('bearer')
export class CrmActivitiesController {
  constructor(private readonly activitiesService: CrmActivitiesService) {}

  @Get()
  @Permissions('users.view')
  list(@Query() query: Record<string, any>) {
    return this.activitiesService.listActivities(query);
  }

  @Post()
  @Permissions('users.manage')
  create(@Body() dto: UpsertCrmActivityDto, @Req() req: any) {
    return this.activitiesService.createActivity(dto, req.user?.id);
  }

  @Get(':id')
  @Permissions('users.view')
  get(@Param('id') id: string) {
    return this.activitiesService.getActivity(id);
  }

  @Patch(':id')
  @Permissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpsertCrmActivityDto) {
    return this.activitiesService.updateActivity(id, dto);
  }

  @Delete(':id')
  @Permissions('users.manage')
  delete(@Param('id') id: string) {
    return this.activitiesService.deleteActivity(id);
  }
}
