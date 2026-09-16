import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePolicyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  module!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  policy_key!: string;

  @ApiPropertyOptional({ default: 'global' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  scope_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  scope_id?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiProperty({ type: Object })
  @IsObject()
  config_json!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  document_version?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  require_acknowledgement?: boolean;
}
