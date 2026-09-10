import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertFinanceReportingPeriodDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  year!: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiPropertyOptional({ example: 'March 2026' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  end_date!: string;

  @ApiPropertyOptional({ enum: ['open', 'closed'] })
  @IsOptional()
  @IsString()
  @IsIn(['open', 'closed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
