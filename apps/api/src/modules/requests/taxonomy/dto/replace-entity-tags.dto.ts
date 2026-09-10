import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReplaceEntityTagsDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  term_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];
}

