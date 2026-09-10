import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAttendanceCorrectionDto {
  @IsDateString()
  work_date!: string;

  @IsString()
  @IsIn(['clock_in', 'clock_out', 'mode_change', 'location_change'])
  request_type!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  proposed_at?: string;

  @IsOptional()
  @IsString()
  @IsIn(['onsite', 'remote', 'field'])
  proposed_mode?: string;

  @IsOptional()
  @IsString()
  proposed_office_location_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  proposed_latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  proposed_longitude?: number;
}
