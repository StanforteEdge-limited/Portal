import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertCrmLeadDto {
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
  company?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  score?: number;

  @IsOptional()
  @IsString()
  owner_profile_id?: string;
}