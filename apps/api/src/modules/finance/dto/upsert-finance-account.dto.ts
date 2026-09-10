import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertFinanceAccountDto {
  @ApiProperty({ example: 'Main Operations Account' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'OPS-001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'First Bank' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ example: 'Stanforte Edge Ltd' })
  @IsOptional()
  @IsString()
  account_name?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiPropertyOptional({ example: 'Ikeja Branch' })
  @IsOptional()
  @IsString()
  branch_name?: string;

  @ApiPropertyOptional({ example: 'bank', enum: ['bank', 'cash', 'wallet', 'other'] })
  @IsOptional()
  @IsIn(['bank', 'cash', 'wallet', 'other'])
  account_type?: string;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be 3-letter ISO code' })
  currency?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  opening_balance?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
