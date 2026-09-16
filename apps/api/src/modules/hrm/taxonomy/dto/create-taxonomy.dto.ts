import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTaxonomyDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

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

