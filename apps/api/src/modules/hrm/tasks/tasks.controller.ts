import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { UpsertTeamGoalDto, UpsertTeamKpiDto, UpsertTeamObjectiveDto } from '$modules/hrm/tasks/dto/upsert-team-goal.dto';
import { UpsertSprintDto } from '$modules/hrm/tasks/dto/upsert-sprint.dto';
import { UpsertWorkItemDto } from '$modules/hrm/tasks/dto/upsert-work-item.dto';
import { UpsertWorkLogDto } from '$modules/hrm/tasks/dto/upsert-work-log.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Tasks')
@ApiBearerAuth('bearer')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('goals')
  @Permissions('tasks.view')
  listGoals(@Query() query: Record<string, any>) {
    return this.tasksService.listGoals(query);
  }

  @Post('goals')
  @Permissions('tasks.manage')
  createGoal(@Req() req: any, @Body() dto: UpsertTeamGoalDto) {
    return this.tasksService.upsertGoal(req.user?.id, dto);
  }

  @Post('goals/:id')
  @Permissions('tasks.manage')
  updateGoal(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertTeamGoalDto) {
    return this.tasksService.upsertGoal(req.user?.id, dto, id);
  }

  @Get('objectives')
  @Permissions('tasks.view')
  listObjectives(@Query() query: Record<string, any>) {
    return this.tasksService.listObjectives(query);
  }

  @Post('objectives')
  @Permissions('tasks.manage')
  createObjective(@Req() req: any, @Body() dto: UpsertTeamObjectiveDto) {
    return this.tasksService.upsertObjective(req.user?.id, dto);
  }

  @Post('objectives/:id')
  @Permissions('tasks.manage')
  updateObjective(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertTeamObjectiveDto) {
    return this.tasksService.upsertObjective(req.user?.id, dto, id);
  }

  @Get('kpis')
  @Permissions('tasks.view')
  listKpis(@Query() query: Record<string, any>) {
    return this.tasksService.listKpis(query);
  }

  @Post('kpis')
  @Permissions('tasks.manage')
  createKpi(@Req() req: any, @Body() dto: UpsertTeamKpiDto) {
    return this.tasksService.upsertKpi(req.user?.id, dto);
  }

  @Post('kpis/:id')
  @Permissions('tasks.manage')
  updateKpi(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertTeamKpiDto) {
    return this.tasksService.upsertKpi(req.user?.id, dto, id);
  }

  @Get('my/items')
  @Permissions('tasks.view')
  listMyItems(@Req() req: any, @Query() query: Record<string, any>) {
    return this.tasksService.listMyItems(req.user?.id, query);
  }

  @Get('team/items')
  @Permissions('tasks.manage')
  listTeamItems(@Req() req: any, @Query() query: Record<string, any>) {
    return this.tasksService.listTeamItems(req.user?.id, query);
  }

  @Get('board')
  @Permissions('tasks.view')
  board(@Req() req: any, @Query() query: Record<string, any>) {
    return this.tasksService.board(req.user?.id, query);
  }

  @Get('sprints')
  @Permissions('tasks.view')
  listSprints(@Query() query: Record<string, any>) {
    return this.tasksService.listSprints(query);
  }

  @Get('sprints/:id')
  @Permissions('tasks.view')
  getSprint(@Param('id') id: string) {
    return this.tasksService.getSprint(id);
  }

  @Post('sprints')
  @Permissions('tasks.manage')
  createSprint(@Req() req: any, @Body() dto: UpsertSprintDto) {
    return this.tasksService.upsertSprint(req.user?.id, dto);
  }

  @Post('sprints/:id')
  @Permissions('tasks.manage')
  updateSprint(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertSprintDto) {
    return this.tasksService.upsertSprint(req.user?.id, dto, id);
  }

  @Post('sprints/:id/start')
  @Permissions('tasks.manage')
  startSprint(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.startSprint(req.user?.id, id);
  }

  @Post('sprints/:id/complete')
  @Permissions('tasks.manage')
  completeSprint(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.completeSprint(req.user?.id, id);
  }

  @Post('items')
  @Permissions('tasks.view')
  createItem(@Req() req: any, @Body() dto: UpsertWorkItemDto) {
    return this.tasksService.upsertItem(req.user?.id, dto);
  }

  @Post('items/:id')
  @Permissions('tasks.view')
  updateItem(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertWorkItemDto) {
    return this.tasksService.upsertItem(req.user?.id, dto, id);
  }

  @Get('my/logs')
  @Permissions('tasks.view')
  listMyLogs(@Req() req: any, @Query() query: Record<string, any>) {
    return this.tasksService.listMyLogs(req.user?.id, query);
  }

  @Get('team/logs')
  @Permissions('tasks.manage')
  listTeamLogs(@Req() req: any, @Query() query: Record<string, any>) {
    return this.tasksService.listTeamLogs(req.user?.id, query);
  }

  @Post('logs')
  @Permissions('tasks.view')
  createLog(@Req() req: any, @Body() dto: UpsertWorkLogDto) {
    return this.tasksService.upsertLog(req.user?.id, dto);
  }

  @Post('logs/:id')
  @Permissions('tasks.view')
  updateLog(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertWorkLogDto) {
    return this.tasksService.upsertLog(req.user?.id, dto, id);
  }

  @Post('logs/:id/submit')
  @Permissions('tasks.view')
  submitLog(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.submitLog(req.user?.id, id);
  }

  @Post('logs/:id/approve')
  @Permissions('tasks.approve')
  approveLog(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.approveLog(req.user?.id, id, true);
  }

  @Post('logs/:id/reject')
  @Permissions('tasks.approve')
  rejectLog(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.approveLog(req.user?.id, id, false);
  }

  @Get('my/timesheet-summary')
  @Permissions('tasks.view')
  myTimesheetSummary(@Req() req: any, @Query() query: Record<string, any>) {
    return this.tasksService.myTimesheetSummary(req.user?.id, query);
  }
}
