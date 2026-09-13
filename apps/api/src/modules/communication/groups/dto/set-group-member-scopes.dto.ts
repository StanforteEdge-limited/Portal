import { IsArray, IsOptional, IsString } from 'class-validator';

export class SetGroupMemberScopesDto {
  @IsArray()
  @IsString({ each: true })
  organization_ids!: string[];

  @IsOptional()
  @IsString()
  scope_role?: string;
}
