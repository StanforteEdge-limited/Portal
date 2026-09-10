import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListAcknowledgementsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Admin only: filter by user id' })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  per_page?: string;
}
