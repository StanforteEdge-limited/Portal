import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from 'class-validator';

const EMPLOYMENT_TYPES = ['full_time', 'contract', 'intern', 'consultant'] as const;
const EMPLOYMENT_STATUSES = ['draft', 'active', 'suspended', 'exited'] as const;
const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const;

export class UpsertEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employee_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  job_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  job_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manager_user_id?: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employment_type?: (typeof EMPLOYMENT_TYPES)[number];

  @ApiPropertyOptional({ enum: EMPLOYMENT_STATUSES })
  @IsOptional()
  @IsIn(EMPLOYMENT_STATUSES)
  employment_status?: (typeof EMPLOYMENT_STATUSES)[number];

  @ApiPropertyOptional({ enum: WORK_MODES })
  @IsOptional()
  @IsIn(WORK_MODES)
  work_mode?: (typeof WORK_MODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  confirmation_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exit_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primary_team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primary_organization_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class EmployeeActionDto {
  @ApiPropertyOptional({ enum: ['activate', 'suspend', 'exit'] })
  @IsString()
  @IsIn(['activate', 'suspend', 'exit'])
  action!: 'activate' | 'suspend' | 'exit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
