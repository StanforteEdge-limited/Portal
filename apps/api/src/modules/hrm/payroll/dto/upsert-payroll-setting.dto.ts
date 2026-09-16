import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertPayrollSettingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  default_expense_account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  default_cash_account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employee_tax_table_id?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
