import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SwitchTenantDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  tenant_id!: string;
}
