import {
  IsArray, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class StatutoryDeductionJournalLineDto {
  @IsString()
  chart_account_id!: string;

  @IsOptional() @IsString() organization_id?: string;
  @IsOptional() @IsString() team_id?: string;
  @IsOptional() @IsString() fund_id?: string;
  @IsOptional() @IsString() grant_id?: string;

  @IsNumber() @Min(0) debit!: number;
  @IsNumber() @Min(0) credit!: number;

  @IsOptional() @IsString() @MaxLength(255) description?: string;
}

export class CreateStatutoryDeductionManualEntryDto {
  @IsDateString() entry_date!: string;
  @IsOptional() @IsString() @MaxLength(255) memo?: string;
  @IsOptional() @IsString() currency?: string;

  @IsString()
  deduction_type_id!: string;

  @IsNumber() @Min(0) gross_amount!: number;
  @IsNumber() @Min(0) withheld_amount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatutoryDeductionJournalLineDto)
  lines!: StatutoryDeductionJournalLineDto[];
}
