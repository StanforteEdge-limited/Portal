import { IsIn, IsOptional, IsString } from 'class-validator';

export class AddProjectMemberDto {
  @IsString()
  user_id!: string;

  @IsOptional()
  @IsString()
  @IsIn(['member', 'admin', 'moderator'])
  role?: 'member' | 'admin' | 'moderator';
}
