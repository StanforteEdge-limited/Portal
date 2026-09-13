import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertCrmActivityDto {
  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsString()
  contact_id?: string;

  @IsOptional()
  @IsString()
  opportunity_id?: string;

  @IsOptional()
  @IsDateString()
  due_at?: string;

  @IsOptional()
  @IsDateString()
  done_at?: string;
}