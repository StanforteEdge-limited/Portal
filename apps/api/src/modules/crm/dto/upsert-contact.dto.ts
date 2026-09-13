import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpsertCrmContactDto {
  @IsString()
  first_name!: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  job_title?: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  is_primary?: boolean;
}