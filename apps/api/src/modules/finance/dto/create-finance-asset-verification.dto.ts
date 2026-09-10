import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateFinanceAssetVerificationDto {
  @ApiProperty({ example: '2026-03-18' })
  @IsDateString()
  verified_at!: string;

  @ApiProperty({ example: 'good' })
  @IsString()
  condition!: string;

  @ApiPropertyOptional({ example: 'Head Office' })
  @IsOptional()
  @IsString()
  location_project?: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  assigned_to_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
