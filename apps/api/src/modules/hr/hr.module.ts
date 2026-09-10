import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PoliciesModule } from '../policies/policies.module';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';

@Module({
  imports: [PoliciesModule],
  controllers: [HrController, AttendanceController, DesignationsController],
  providers: [HrService, AttendanceService, DesignationsService]
})
export class HrModule {}
