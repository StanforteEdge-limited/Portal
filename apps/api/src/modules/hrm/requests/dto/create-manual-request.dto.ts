import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ManualDeductionDto {
  @ApiProperty()
  @IsUUID()
  deduction_type_id!: string;

  @ApiProperty()
  @IsNumber()
  rate!: number;

  @ApiProperty()
  @IsNumber()
  gross_amount!: number;

  @ApiProperty()
  @IsNumber()
  deduction_amount!: number;
}

class ManualItemDto {
  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  file_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  file_ids?: string[];

  @ApiPropertyOptional({ example: 'GTBank' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  account_name?: string;
}

class ManualApprovalDto {
  @ApiProperty({ example: 'team_lead' })
  @IsString()
  role!: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '2026-02-10T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  done?: boolean;

  @ApiPropertyOptional({ example: 'Approved.' })
  @IsOptional()
  @IsString()
  comment?: string;
}

class ManualVoucherDto {
  @ApiPropertyOptional({ example: 'PV/2025/016' })
  @IsOptional()
  @IsString()
  voucher_number?: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transaction_ref?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '2025-11-12T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  disbursed_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  evidence_file_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evidence_file_ids?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paid_from_account_id?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  retired_amount?: number;

  @ApiPropertyOptional({ enum: ['not_retired', 'partial', 'retired', 'verified'] })
  @IsOptional()
  @IsString()
  retirement_status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  retirement_file_ids?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contact_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gross_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  net_amount?: number;

  @ApiPropertyOptional({ type: [ManualDeductionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualDeductionDto)
  deductions?: ManualDeductionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refund_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refund_method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refund_reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refund_date?: string;
}

export class CreateManualRequestDto {
  @ApiProperty({ example: '0ee2e10c-7eb6-4afd-ae36-456094202cbd' })
  @IsUUID()
  request_type_id!: string;

  @ApiProperty({ example: '1', description: 'Profile ID (bigint string) of requester/staff' })
  @IsString()
  @Matches(/^\d+$/, { message: 'staff_id must be numeric profile id' })
  staff_id!: string;

  @ApiPropertyOptional({ example: '25', description: 'Optional explicit request ID for legacy import' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'request_id must be numeric request id' })
  request_id?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'team_id must be numeric group id' })
  team_id?: string;

  @ApiPropertyOptional({ example: '4' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'organization_id must be numeric organization id' })
  organization_id?: string;

  @ApiPropertyOptional({ example: 'completed' })
  @IsOptional()
  @IsIn(['draft', 'returned', 'sent', 'approval', 'cleared', 'disbursed', 'confirmed', 'retired', 'completed', 'rejected', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ example: '2025-11-12T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  created_at?: string;

  @ApiPropertyOptional({ default: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [ManualApprovalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualApprovalDto)
  approvals?: ManualApprovalDto[];

  @ApiPropertyOptional({ type: [ManualItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualItemDto)
  items?: ManualItemDto[];

  @ApiPropertyOptional({ type: [ManualVoucherDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualVoucherDto)
  disbursements?: ManualVoucherDto[];

}
