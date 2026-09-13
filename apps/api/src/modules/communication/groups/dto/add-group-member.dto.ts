import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class AddGroupMemberDto {
  @IsString()
  user_id!: string;

  @IsOptional()
  @IsString()
  @IsIn(['member', 'lead', 'manager'])
  role?: 'member' | 'lead' | 'manager';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organization_ids?: string[];
}
