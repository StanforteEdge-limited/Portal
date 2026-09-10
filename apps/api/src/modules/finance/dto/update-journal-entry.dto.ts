import {
  IsArray, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateJournalLineDto {
  @IsOptional() @IsString() id?: string;
  @IsString() chart_account_id!: string;
  @IsOptional() @IsString() organization_id?: string;
  @IsOptional() @IsString() team_id?: string;
  @IsOptional() @IsString() fund_id?: string;
  @IsOptional() @IsString() grant_id?: string;
  @IsNumber() @Min(0) debit!: number;
  @IsNumber() @Min(0) credit!: number;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
}

export class UpdateJournalEntryDto {
  @IsOptional() @IsDateString() entry_date?: string;
  @IsOptional() @IsString() @MaxLength(255) memo?: string;
  @IsOptional() @IsString() currency?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateJournalLineDto)
  lines?: UpdateJournalLineDto[];
}
