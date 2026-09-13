import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  organization?: string;
}
