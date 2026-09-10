import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolvePolicyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  module!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  policy_key!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  context?: {
    organization_id?: string;
    team_id?: string;
    staff_type?: string;
    user_id?: string;
  };
}
