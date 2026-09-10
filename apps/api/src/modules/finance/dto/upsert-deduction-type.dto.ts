import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertDeductionTypeDto {
  @ApiPropertyOptional({ example: 'Withholding Tax (Consultant)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'WHT_CONSULT' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 0.05, description: 'Rate as decimal, e.g. 0.05 = 5%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  rate?: number;

  @ApiPropertyOptional({ example: 'vendor', description: 'vendor | employee | both' })
  @IsOptional()
  @IsString()
  applies_to?: string;

  @ApiPropertyOptional({ example: 'f3e8b369-0eca-454f-a8f8-46b780bc6264' })
  @IsOptional()
  @IsUUID()
  gl_account_id?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
