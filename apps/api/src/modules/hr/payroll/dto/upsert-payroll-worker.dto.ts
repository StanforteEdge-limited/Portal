import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';

class PayrollWorkerProfileComponentDto {
  @ApiProperty()
  @IsString()
  component_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

class PayrollWorkerProfileDto {
  @ApiPropertyOptional({ default: 'monthly_fixed' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  pay_basis?: string;

  @ApiPropertyOptional({ default: 'monthly' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pay_frequency?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  base_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  payment_mode?: string;

  @ApiProperty()
  @IsDateString()
  effective_from!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @ApiPropertyOptional({ type: [PayrollWorkerProfileComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollWorkerProfileComponentDto)
  components?: PayrollWorkerProfileComponentDto[];
}

class PayrollWorkerAllocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fund_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grant_id?: string;

  @ApiPropertyOptional({ default: 100 })
  @Type(() => Number)
  @IsNumber()
  allocation_percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allocation_amount?: number;
}

export class UpsertPayrollWorkerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profile_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  default_fund_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  default_grant_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tax_table_id?: string;

  @ApiProperty({ enum: ['employee', 'consultant'] })
  @IsString()
  @IsIn(['employee', 'consultant'])
  worker_type!: 'employee' | 'consultant';

  @ApiPropertyOptional({ enum: ['monthly_fixed', 'hourly_timesheet', 'daily_rate', 'retainer', 'manual'] })
  @IsOptional()
  @IsString()
  @IsIn(['monthly_fixed', 'hourly_timesheet', 'daily_rate', 'retainer', 'manual'])
  pay_basis?: string;

  @ApiPropertyOptional({ enum: ['fixed', 'timesheet', 'hybrid'] })
  @IsOptional()
  @IsString()
  @IsIn(['fixed', 'timesheet', 'hybrid'])
  allocation_mode?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hybrid_fixed_percent?: number;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  standard_hours_per_day?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  full_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  staff_code?: string;

  @ApiPropertyOptional({ default: 'NGN' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ default: 'active' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_account_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_account_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tax_identifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pension_identifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: PayrollWorkerProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollWorkerProfileDto)
  profile?: PayrollWorkerProfileDto;

  @ApiPropertyOptional({ type: [PayrollWorkerAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollWorkerAllocationDto)
  allocations?: PayrollWorkerAllocationDto[];
}
