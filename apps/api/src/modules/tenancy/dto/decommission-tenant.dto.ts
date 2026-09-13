import { IsBoolean } from 'class-validator';

export class DecommissionTenantDto {
  @IsBoolean()
  confirm!: boolean;
}