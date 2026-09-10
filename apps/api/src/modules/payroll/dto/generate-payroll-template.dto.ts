import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class PayrollTemplateLineDto {
  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount!: number;
}

class PayrollSummaryWorkerLineDto {
  @ApiProperty()
  @IsString()
  worker_name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  gross_pay!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  total_deductions!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  net_pay!: number;
}

export class GeneratePayrollPayslipTemplateDto {
  @ApiProperty()
  @IsString()
  worker_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worker_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period_label?: string;

  @ApiPropertyOptional({ default: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: [PayrollTemplateLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollTemplateLineDto)
  earnings?: PayrollTemplateLineDto[];

  @ApiPropertyOptional({ type: [PayrollTemplateLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollTemplateLineDto)
  deductions?: PayrollTemplateLineDto[];

  @ApiPropertyOptional({ type: [PayrollTemplateLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollTemplateLineDto)
  employer_costs?: PayrollTemplateLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class GeneratePayrollSummaryTemplateDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period_label?: string;

  @ApiPropertyOptional({ default: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ type: [PayrollSummaryWorkerLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollSummaryWorkerLineDto)
  workers!: PayrollSummaryWorkerLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
