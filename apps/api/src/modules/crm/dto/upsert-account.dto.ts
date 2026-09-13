import { IsEmail, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertCrmAccountDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  lifecycle_stage?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  owner_profile_id?: string;
}