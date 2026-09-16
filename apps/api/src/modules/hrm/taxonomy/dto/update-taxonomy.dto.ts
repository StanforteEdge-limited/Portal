import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTaxonomyDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  render_type?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

