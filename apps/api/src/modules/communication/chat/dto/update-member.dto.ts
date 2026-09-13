import { IsIn } from 'class-validator';

export class UpdateMemberDto {
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}