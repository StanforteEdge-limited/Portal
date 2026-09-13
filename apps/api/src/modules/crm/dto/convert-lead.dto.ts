import { IsOptional, IsString } from 'class-validator';

export class ConvertLeadDto {
  @IsOptional()
  @IsString()
  account_name?: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsString()
  industry?: string;
}