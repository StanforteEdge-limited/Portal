import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PipelineStageDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probability?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  is_won?: boolean;

  @IsOptional()
  @IsBoolean()
  is_lost?: boolean;
}

export class UpsertCrmPipelineDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages?: PipelineStageDto[];
}

export class ReplaceCrmPipelineStagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages!: PipelineStageDto[];
}