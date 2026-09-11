import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceScheduler } from './attendance.scheduler';
import { PoliciesModule } from '$modules/requests/policies/policies.module';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';
import { NotificationsModule } from '$modules/notifications/notifications.module';

@Module({
  imports: [PoliciesModule, NotificationsModule],
  controllers: [HrController, AttendanceController, DesignationsController],
  providers: [HrService, AttendanceService, AttendanceScheduler, DesignationsService]
})
export class HrModule {}
