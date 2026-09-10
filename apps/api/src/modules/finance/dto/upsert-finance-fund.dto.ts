import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertFinanceFundDto {
  @ApiProperty({ example: 'UNR-001' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Unrestricted Operations Fund' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'operating' })
  @IsOptional()
  @IsString()
  fund_type?: string;

  @ApiPropertyOptional({ example: 'unrestricted' })
  @IsOptional()
  @IsString()
  restriction_type?: string;

  @ApiPropertyOptional({ example: 'General support and operations' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  donor_id?: string;

  @ApiPropertyOptional({ example: '7' })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
