import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { ClockAttendanceDto } from './dto/attendance.dto';
import { CreateAttendanceCorrectionDto } from './dto/create-attendance-correction.dto';
import { CreateAttendanceExceptionDto } from './dto/create-attendance-exception.dto';
import { ReviewAttendanceCorrectionDto } from './dto/review-attendance-correction.dto';
import { ReviewAttendanceExceptionDto } from './dto/review-attendance-exception.dto';
import { UpsertOfficeLocationDto } from './dto/upsert-office-location.dto';
import { AttendanceService } from './attendance.service';

@Controller('hr/attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('HR Attendance')
@ApiBearerAuth('bearer')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @Permissions('attendance.clock')
  clockIn(@Req() req: any, @Body() dto: ClockAttendanceDto) {
    return this.attendanceService.clockIn(req.user?.id, req, dto);
  }

  @Post('clock-out')
  @Permissions('attendance.clock')
  clockOut(@Req() req: any, @Body() dto: ClockAttendanceDto) {
    return this.attendanceService.clockOut(req.user?.id, req, dto);
  }

  @Get('me')
  @Permissions('attendance.view_self')
  me(@Req() req: any, @Query() query: Record<string, any>) {
    return this.attendanceService.myAttendance(req.user?.id, query);
  }

  @Get('status')
  @Permissions('attendance.view_self')
  status(@Req() req: any) {
    return this.attendanceService.getAttendanceStatus(req.user?.id);
  }

  @Get('summary')
  @Permissions('attendance.view_team')
  summary(@Query() query: Record<string, any>) {
    return this.attendanceService.summary(query);
  }

  @Get('records')
  @Permissions('attendance.view_team')
  records(@Query() query: Record<string, any>) {
    return this.attendanceService.records(query);
  }

  @Get('records/:userId/:workDate')
  @Permissions('attendance.view_team')
  getDailyRecord(@Param('userId') userId: string, @Param('workDate') workDate: string) {
    return this.attendanceService.getDailyRecord(userId, workDate);
  }

  @Get('office-locations')
  @Permissions('attendance.view_team')
  officeLocations(@Query() query: Record<string, any>) {
    return this.attendanceService.listOfficeLocations(query);
  }

  @Post('office-locations')
  @Permissions('attendance.manage')
  createOfficeLocation(@Req() req: any, @Body() dto: UpsertOfficeLocationDto) {
    return this.attendanceService.createOfficeLocation(req.user?.id, dto);
  }

  @Patch('office-locations/:id')
  @Permissions('attendance.manage')
  updateOfficeLocation(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertOfficeLocationDto) {
    return this.attendanceService.updateOfficeLocation(req.user?.id, id, dto);
  }

  @Get('corrections')
  @Permissions('attendance.view_team')
  corrections(@Req() req: any, @Query() query: Record<string, any>) {
    return this.attendanceService.listCorrections(req.user?.id, query);
  }

  @Post('corrections')
  @Permissions('attendance.clock')
  createCorrection(@Req() req: any, @Body() dto: CreateAttendanceCorrectionDto) {
    return this.attendanceService.createCorrection(req.user?.id, dto);
  }

  @Post('corrections/:id/approve')
  @Permissions('attendance.approve')
  approveCorrection(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewAttendanceCorrectionDto) {
    return this.attendanceService.approveCorrection(req.user?.id, id, dto);
  }

  @Post('corrections/:id/reject')
  @Permissions('attendance.approve')
  rejectCorrection(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewAttendanceCorrectionDto) {
    return this.attendanceService.rejectCorrection(req.user?.id, id, dto);
  }

  @Get('exceptions')
  @Permissions('attendance.view_team')
  exceptions(@Query() query: Record<string, any>) {
    return this.attendanceService.listExceptions(query);
  }

  @Post('exceptions')
  @Permissions('attendance.manage')
  createException(@Req() req: any, @Body() dto: CreateAttendanceExceptionDto) {
    return this.attendanceService.createException(req.user?.id, dto);
  }

  @Post('exceptions/:id/resolve')
  @Permissions('attendance.correct')
  resolveException(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewAttendanceExceptionDto) {
    return this.attendanceService.resolveException(req.user?.id, id, dto);
  }
}
