import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertFinanceAssetDto {
  @ApiPropertyOptional({ example: 'SEA-001' })
  @IsOptional()
  @IsString()
  asset_id?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional({ example: '4' })
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiProperty({ example: 'Dell Laptop (15.6\")' })
  @IsString()
  asset_description!: string;

  @ApiProperty({ example: 'IT Equipment' })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ example: 'SN-DL-00124' })
  @IsOptional()
  @IsString()
  serial_tag_no?: string;

  @ApiPropertyOptional({ example: 'Head Office' })
  @IsOptional()
  @IsString()
  location_project?: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  assigned_to_user_id?: string;

  @ApiProperty({ example: '2026-03-18' })
  @IsDateString()
  purchase_date!: string;

  @ApiPropertyOptional({ example: 'TechWorld Nig Ltd' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ example: 350000 })
  @Type(() => Number)
  @IsNumber()
  @Min(50000)
  purchase_cost!: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  useful_life_years!: number;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  salvage_value?: number;

  @ApiPropertyOptional({ example: 'good' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
