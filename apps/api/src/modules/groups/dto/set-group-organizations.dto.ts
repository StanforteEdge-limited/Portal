import { IsArray, IsOptional, IsString } from 'class-validator';

export class SetGroupOrganizationsDto {
  @IsArray()
  @IsString({ each: true })
  organization_ids!: string[];

  @IsOptional()
  @IsString()
  primary_organization_id?: string;
}
