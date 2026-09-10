import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PayPayrollRunDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paid_from_account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
