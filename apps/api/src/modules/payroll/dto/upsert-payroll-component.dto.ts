import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertPayrollComponentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chart_account_id?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ enum: ['earning', 'deduction', 'employer_cost'] })
  @IsIn(['earning', 'deduction', 'employer_cost'])
  component_type!: 'earning' | 'deduction' | 'employer_cost';

  @ApiPropertyOptional({ enum: ['fixed', 'formula', 'percentage'], default: 'fixed' })
  @IsOptional()
  @IsIn(['fixed', 'formula', 'percentage'])
  calculation_type?: 'fixed' | 'formula' | 'percentage';

  @ApiPropertyOptional({ enum: ['employee', 'employer', 'shared'], default: 'employee' })
  @IsOptional()
  @IsIn(['employee', 'employer', 'shared'])
  paid_by?: 'employee' | 'employer' | 'shared';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  employer_share_percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  affects_net_pay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_statutory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
