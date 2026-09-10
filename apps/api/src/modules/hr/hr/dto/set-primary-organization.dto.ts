import { IsString } from 'class-validator';

export class SetPrimaryOrganizationDto {
  @IsString()
  organization_id!: string;
}
