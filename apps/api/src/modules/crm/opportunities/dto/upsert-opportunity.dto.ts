import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertCrmOpportunityDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsString()
  contact_id?: string;

  @IsOptional()
  @IsString()
  pipeline_id?: string;

  @IsOptional()
  @IsString()
  stage_id?: string;

  @IsOptional()
  @IsString()
  owner_profile_id?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  probability?: number;

  @IsOptional()
  @IsDateString()
  expected_close_date?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  status?: string;
}