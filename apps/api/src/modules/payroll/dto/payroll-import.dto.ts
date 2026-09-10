import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class PayrollImportRunRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  run_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period_start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period_end?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paid_from_account?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class PayrollImportWorkerRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worker_ref?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profile_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worker_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  staff_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fund?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grant?: string;

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
  @Type(() => Number)
  @IsNumber()
  base_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effective_from?: string;
}

class PayrollImportLineRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  run_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worker_ref?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  component_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class PayrollImportAllocationRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  run_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worker_ref?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fund?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grant?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allocation_percent?: number;
}

class PayrollImportPaymentRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  run_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worker_ref?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_reference?: string;
}

export class PayrollImportDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  update_existing?: boolean;

  @ApiPropertyOptional({ type: [PayrollImportRunRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollImportRunRowDto)
  runs?: PayrollImportRunRowDto[];

  @ApiPropertyOptional({ type: [PayrollImportWorkerRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollImportWorkerRowDto)
  workers?: PayrollImportWorkerRowDto[];

  @ApiPropertyOptional({ type: [PayrollImportLineRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollImportLineRowDto)
  lines?: PayrollImportLineRowDto[];

  @ApiPropertyOptional({ type: [PayrollImportAllocationRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollImportAllocationRowDto)
  allocations?: PayrollImportAllocationRowDto[];

  @ApiPropertyOptional({ type: [PayrollImportPaymentRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollImportPaymentRowDto)
  payments?: PayrollImportPaymentRowDto[];
}
