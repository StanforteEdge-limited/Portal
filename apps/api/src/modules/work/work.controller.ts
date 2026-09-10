import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { UpsertTeamGoalDto, UpsertTeamKpiDto, UpsertTeamObjectiveDto } from './dto/upsert-team-goal.dto';
import { UpsertWorkItemDto } from './dto/upsert-work-item.dto';
import { UpsertWorkLogDto } from './dto/upsert-work-log.dto';
import { WorkService } from './work.service';

@Controller('work')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Work')
@ApiBearerAuth('bearer')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Get('goals')
  @Permissions('work.view')
  listGoals(@Query() query: Record<string, any>) {
    return this.workService.listGoals(query);
  }

  @Post('goals')
  @Permissions('work.manage')
  createGoal(@Req() req: any, @Body() dto: UpsertTeamGoalDto) {
    return this.workService.upsertGoal(req.user?.id, dto);
  }

  @Post('goals/:id')
  @Permissions('work.manage')
  updateGoal(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertTeamGoalDto) {
    return this.workService.upsertGoal(req.user?.id, dto, id);
  }

  @Get('objectives')
  @Permissions('work.view')
  listObjectives(@Query() query: Record<string, any>) {
    return this.workService.listObjectives(query);
  }

  @Post('objectives')
  @Permissions('work.manage')
  createObjective(@Req() req: any, @Body() dto: UpsertTeamObjectiveDto) {
    return this.workService.upsertObjective(req.user?.id, dto);
  }

  @Post('objectives/:id')
  @Permissions('work.manage')
  updateObjective(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertTeamObjectiveDto) {
    return this.workService.upsertObjective(req.user?.id, dto, id);
  }

  @Get('kpis')
  @Permissions('work.view')
  listKpis(@Query() query: Record<string, any>) {
    return this.workService.listKpis(query);
  }

  @Post('kpis')
  @Permissions('work.manage')
  createKpi(@Req() req: any, @Body() dto: UpsertTeamKpiDto) {
    return this.workService.upsertKpi(req.user?.id, dto);
  }

  @Post('kpis/:id')
  @Permissions('work.manage')
  updateKpi(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertTeamKpiDto) {
    return this.workService.upsertKpi(req.user?.id, dto, id);
  }

  @Get('my/items')
  @Permissions('work.view')
  listMyItems(@Req() req: any, @Query() query: Record<string, any>) {
    return this.workService.listMyItems(req.user?.id, query);
  }

  @Get('team/items')
  @Permissions('work.manage')
  listTeamItems(@Req() req: any, @Query() query: Record<string, any>) {
    return this.workService.listTeamItems(req.user?.id, query);
  }

  @Post('items')
  @Permissions('work.view')
  createItem(@Req() req: any, @Body() dto: UpsertWorkItemDto) {
    return this.workService.upsertItem(req.user?.id, dto);
  }

  @Post('items/:id')
  @Permissions('work.view')
  updateItem(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertWorkItemDto) {
    return this.workService.upsertItem(req.user?.id, dto, id);
  }

  @Get('my/logs')
  @Permissions('work.view')
  listMyLogs(@Req() req: any, @Query() query: Record<string, any>) {
    return this.workService.listMyLogs(req.user?.id, query);
  }

  @Get('team/logs')
  @Permissions('work.manage')
  listTeamLogs(@Req() req: any, @Query() query: Record<string, any>) {
    return this.workService.listTeamLogs(req.user?.id, query);
  }

  @Post('logs')
  @Permissions('work.view')
  createLog(@Req() req: any, @Body() dto: UpsertWorkLogDto) {
    return this.workService.upsertLog(req.user?.id, dto);
  }

  @Post('logs/:id')
  @Permissions('work.view')
  updateLog(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertWorkLogDto) {
    return this.workService.upsertLog(req.user?.id, dto, id);
  }

  @Post('logs/:id/submit')
  @Permissions('work.view')
  submitLog(@Req() req: any, @Param('id') id: string) {
    return this.workService.submitLog(req.user?.id, id);
  }

  @Post('logs/:id/approve')
  @Permissions('work.approve')
  approveLog(@Req() req: any, @Param('id') id: string) {
    return this.workService.approveLog(req.user?.id, id, true);
  }

  @Post('logs/:id/reject')
  @Permissions('work.approve')
  rejectLog(@Req() req: any, @Param('id') id: string) {
    return this.workService.approveLog(req.user?.id, id, false);
  }

  @Get('my/timesheet-summary')
  @Permissions('work.view')
  myTimesheetSummary(@Req() req: any, @Query() query: Record<string, any>) {
    return this.workService.myTimesheetSummary(req.user?.id, query);
  }
}
