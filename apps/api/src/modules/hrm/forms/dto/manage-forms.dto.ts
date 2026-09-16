import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'datetime',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'file',
  'document_acknowledgement'
] as const;

export class CreateFormDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storage_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateFormDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storage_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateFormFieldDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  field_key!: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  field_label!: string;

  @ApiPropertyOptional({ enum: FIELD_TYPES })
  @IsString()
  @IsIn(FIELD_TYPES)
  field_type!: (typeof FIELD_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  field_options?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  validation_rules?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class UpdateFormFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  field_label?: string;

  @ApiPropertyOptional({ enum: FIELD_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(FIELD_TYPES)
  field_type?: (typeof FIELD_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  field_options?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  validation_rules?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class CreateFormAssignmentDto {
  @ApiPropertyOptional()
  @IsUUID()
  form_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigned_to_role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigned_to_profile_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  due_date?: string;
}
