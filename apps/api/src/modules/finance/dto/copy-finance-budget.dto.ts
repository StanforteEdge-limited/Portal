import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class CopyFinanceBudgetDto {
  @ApiPropertyOptional({ example: 'full' })
  @IsOptional()
  @IsIn(['full', 'header_only', 'header_lines_assumptions'])
  mode?: 'full' | 'header_only' | 'header_lines_assumptions';

  @ApiPropertyOptional({ example: 'next_month' })
  @IsOptional()
  @IsIn(['same_period', 'next_month', 'next_quarter', 'next_fiscal_year'])
  period_shift?: 'same_period' | 'next_month' | 'next_quarter' | 'next_fiscal_year';
}
