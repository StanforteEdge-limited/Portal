import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertWorkItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['weekly_task', 'daily_task', 'project_activity', 'recurring_responsibility', 'ad_hoc'] })
  @IsOptional()
  @IsIn(['weekly_task', 'daily_task', 'project_activity', 'recurring_responsibility', 'ad_hoc'])
  item_type?: string;

  @ApiPropertyOptional({ enum: ['planned', 'in_progress', 'completed', 'blocked', 'carried_over', 'cancelled'] })
  @IsOptional()
  @IsIn(['planned', 'in_progress', 'completed', 'blocked', 'carried_over', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  owner_team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondary_team_id?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigned_to_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  planned_start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  week_start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expected_hours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_staff_added?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requires_manager_ack?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goal_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kpi_id?: string;
}
