import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class UpdateRemittanceAllocationDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number) allocated_amount?: number;
}

export class UpdatePendingDeductionDto {
  @IsOptional() @IsString() deduction_type_id?: string;
  @IsOptional() @IsNumber() @Min(0) gross_amount?: number;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsNumber() @Min(0) rate?: number;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateRemittanceRecordDto {
  @IsOptional() @IsString() @MaxLength(60) remittance_number?: string;
  @IsOptional() @IsString() @MaxLength(255) remittance_ref?: string;
  @IsOptional() @IsString() remitted_at?: string;
  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number) remittance_total_amount?: number;
  @IsOptional() @IsString() paid_from_account_id?: string;
  @IsOptional() @IsString() payment_voucher_id?: string;
  @IsOptional() @IsString() remitted_by?: string;
  @IsOptional() @IsString() evidence_file_id?: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) evidence_file_ids?: string[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateRemittanceAllocationDto) allocations?: UpdateRemittanceAllocationDto[];
}

export class AddRemittanceAllocationsDto {
  @IsArray() @IsUUID('4', { each: true }) deduction_ids!: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateRemittanceAllocationDto) allocations?: UpdateRemittanceAllocationDto[];
}
