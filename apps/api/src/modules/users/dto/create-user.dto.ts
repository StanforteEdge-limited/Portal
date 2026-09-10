import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../../common/validation/password-policy';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'jdoe' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'jdoe@stanforteedge.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'ChangeMe123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ example: 'staff' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['active', 'pending'], example: 'pending' })
  @IsOptional()
  @IsIn(['active', 'pending'])
  status?: 'active' | 'pending';

  @ApiPropertyOptional({ type: [String], example: ['staff'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  primary_organization_id?: string;

  @ApiPropertyOptional({ example: true, description: 'When true, password is required and stored for immediate login.' })
  @IsOptional()
  @IsBoolean()
  set_password?: boolean;

  @ApiPropertyOptional({ example: true, description: 'When true, sends invite email with password setup link.' })
  @IsOptional()
  @IsBoolean()
  send_invite?: boolean;

  @ApiPropertyOptional({ example: false, description: 'When true, sends welcome email after account creation.' })
  @IsOptional()
  @IsBoolean()
  send_welcome_email?: boolean;
}
