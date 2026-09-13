import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

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
  @IsString()
  group_type?: string;
}
