import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpsertFinanceGrantDto {
  @ApiProperty({ example: 'GRT-2026-001' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Education Program Grant 2026' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'restricted' })
  @IsOptional()
  @IsString()
  restriction_type?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  donor_id?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  fund_id?: string;

  @ApiPropertyOptional({ example: '7' })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  committed_amount?: number;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  recognized_amount?: number;

  @ApiPropertyOptional({ example: 5000000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  deferred_amount?: number;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
