import { IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permission_ids!: string[];
}
