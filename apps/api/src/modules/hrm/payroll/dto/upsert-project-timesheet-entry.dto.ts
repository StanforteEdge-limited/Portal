import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertProjectTimesheetEntryDto {
  @ApiProperty()
  @IsString()
  worker_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  component_id?: string;

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

  @ApiProperty()
  @IsDateString()
  work_date!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'submitted', 'approved', 'rejected'])
  status?: string;
}
