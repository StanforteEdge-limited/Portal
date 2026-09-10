import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpsertWorkLogDto {
  @ApiProperty()
  @IsUUID()
  work_item_id!: string;

  @ApiProperty()
  @IsDateString()
  log_date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  hours_spent?: number;

  @ApiPropertyOptional({ enum: ['planned', 'in_progress', 'completed', 'blocked', 'carried_over', 'cancelled'] })
  @IsOptional()
  @IsIn(['planned', 'in_progress', 'completed', 'blocked', 'carried_over', 'cancelled'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progress_percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blocker_note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  carried_over?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  carry_over_to_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fund_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grant_id?: string;
}
