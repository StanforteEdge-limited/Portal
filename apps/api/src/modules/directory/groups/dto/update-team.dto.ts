import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organization_ids?: string[];

  @IsOptional()
  @IsString()
  primary_organization_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  group_type?: string;
}
