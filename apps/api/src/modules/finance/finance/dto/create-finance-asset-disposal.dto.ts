import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFinanceAssetDisposalDto {
  @ApiProperty({ example: '2026-03-18' })
  @IsDateString()
  disposal_date!: string;

  @ApiProperty({ example: 'Sold' })
  @IsString()
  disposal_method!: string;

  @ApiPropertyOptional({ example: 50000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  proceeds?: number;

  @ApiPropertyOptional({ example: '7' })
  @IsOptional()
  @IsString()
  approved_by?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  donor_asset?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
