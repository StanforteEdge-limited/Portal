import { IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  organization_type?: 'group' | 'venture' | 'shared_function';

  @IsOptional()
  is_active?: boolean;

  @IsOptional()
  parent_organization_id?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
