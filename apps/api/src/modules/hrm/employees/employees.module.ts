import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PoliciesModule } from '$modules/hrm/policies/policies.module';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';

@Module({
  imports: [PoliciesModule],
  controllers: [EmployeesController, DesignationsController],
  providers: [EmployeesService, DesignationsService]
})
export class EmployeesModule {}
