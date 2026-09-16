import { Module } from '@nestjs/common';
import { NotificationsModule } from '$modules/hrm/notifications/notifications.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceScheduler } from './attendance.scheduler';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceScheduler]
})
export class AttendanceModule {}
