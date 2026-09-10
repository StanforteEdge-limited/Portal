import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertFinanceChartAccountDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  finance_account_id?: string;

  @ApiProperty({ example: '1000' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Cash at Bank - Operations' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['asset', 'liability', 'equity', 'income', 'expense'] })
  @IsString()
  @IsIn(['asset', 'liability', 'equity', 'income', 'expense'])
  type!: string;

  @ApiProperty({ example: 'bank' })
  @IsString()
  category!: string;

  @ApiProperty({ enum: ['debit', 'credit'] })
  @IsString()
  @IsIn(['debit', 'credit'])
  normal_balance!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_control_account?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
