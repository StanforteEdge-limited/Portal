import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePayrollRunItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gross_pay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_deductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  employer_cost_total?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  net_pay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actual_net_pay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  net_adjustment_reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_reference?: string;
}
