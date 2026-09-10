import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class AssignUserRolesDto {
  @IsArray()
  @IsString({ each: true })
  role_ids!: string[];

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsBoolean()
  replace_existing?: boolean;

  @IsOptional()
  @IsString()
  primary_role_id?: string;
}
