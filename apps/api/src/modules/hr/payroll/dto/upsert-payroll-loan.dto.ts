import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertPayrollLoanDto {
  @ApiProperty()
  @IsString()
  worker_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  component_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  request_id?: string;

  @ApiProperty({ enum: ['loan', 'salary_advance'] })
  @IsIn(['loan', 'salary_advance'])
  loan_type!: 'loan' | 'salary_advance';

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  principal_amount!: number;

  @ApiProperty()
  @IsDateString()
  issued_date!: string;

  @ApiProperty()
  @IsDateString()
  start_recovery_date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthly_recovery_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  recovery_rate?: number;

  @ApiPropertyOptional({ enum: ['active', 'paused', 'closed'], default: 'active' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'closed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
