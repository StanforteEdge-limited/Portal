import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReviewPayrollRunDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
