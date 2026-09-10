import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitFinanceBudgetRevisionDto {
  @ApiPropertyOptional({ example: 'Please review July OPEX budget' })
  @IsOptional()
  @IsString()
  comment?: string;
}
