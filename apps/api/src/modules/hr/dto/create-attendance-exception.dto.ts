import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAttendanceExceptionDto {
  @IsString()
  user_id!: string;

  @IsDateString()
  work_date!: string;

  @IsString()
  @IsIn(['missed_punch', 'field_assignment', 'remote_exception', 'excused_absence', 'system_override'])
  exception_type!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsIn(['onsite', 'remote', 'field'])
  attendance_mode?: string;

  @IsOptional()
  @IsString()
  office_location_id?: string;
}
