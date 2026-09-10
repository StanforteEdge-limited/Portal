import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  organization_type?: 'group' | 'venture' | 'shared_function';

  @IsOptional()
  is_active?: boolean;

  @IsOptional()
  parent_organization_id?: string | null;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
