import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ActionFinanceBudgetRevisionDto {
  @ApiPropertyOptional({ example: 'approve' })
  @IsOptional()
  @IsIn(['approve', 'reject', 'return'])
  action?: 'approve' | 'reject' | 'return';

  @ApiPropertyOptional({ example: 'Numbers align with approved ceiling' })
  @IsOptional()
  @IsString()
  comment?: string;
}
