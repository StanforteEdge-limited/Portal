import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertSprintDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ enum: ['planned', 'active', 'completed'] })
  @IsOptional()
  @IsIn(['planned', 'active', 'completed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}