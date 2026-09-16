import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ClockAttendanceDto {
  @ApiPropertyOptional({ enum: ['web', 'mobile', 'admin', 'import'] })
  @IsOptional()
  @IsString()
  @IsIn(['web', 'mobile', 'admin', 'import'])
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  at?: string;

  @ApiPropertyOptional({ enum: ['onsite', 'remote', 'field'] })
  @IsOptional()
  @IsString()
  @IsIn(['onsite', 'remote', 'field'])
  attendance_mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  office_location_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
