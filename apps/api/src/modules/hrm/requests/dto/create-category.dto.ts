import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsUUID()
  group_id!: string;

  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}
