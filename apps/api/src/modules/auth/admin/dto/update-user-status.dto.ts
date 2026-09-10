import { IsIn, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  @IsIn(['active', 'inactive', 'suspended', 'deleted'])
  status!: string;
}
