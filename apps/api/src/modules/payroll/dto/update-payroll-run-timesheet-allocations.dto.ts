import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class PayrollRunTimesheetAllocationRowDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allocation_percent?: number;

  @ApiPropertyOptional({ default: 'manual' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayrollRunTimesheetAllocationsDto {
  @ApiProperty({ type: [PayrollRunTimesheetAllocationRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollRunTimesheetAllocationRowDto)
  allocations!: PayrollRunTimesheetAllocationRowDto[];
}
