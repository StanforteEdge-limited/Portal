import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DisburseDeductionLineDto {
  @ApiProperty()
  @IsUUID()
  deduction_type_id!: string;

  @ApiProperty({ example: 0.05 })
  @IsNumber()
  rate!: number;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  gross_amount!: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  amount!: number;
}

export class DisburseRequestDto {
  @ApiPropertyOptional({ example: 'Approved and transferred to requester account.' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'STN240217001' })
  @IsOptional()
  @IsString()
  transaction_ref?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 'f3e8b369-0eca-454f-a8f8-46b780bc6264' })
  @IsOptional()
  @IsUUID()
  evidence_file_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evidence_file_ids?: string[];

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  paid_from_account_id?: string;

  @ApiPropertyOptional({ example: '2026-04-09T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  disbursed_at?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Vendor/payee contact ID' })
  @IsOptional()
  @IsUUID()
  contact_id?: string;

  @ApiPropertyOptional({ type: [String], description: 'List of specific RequestItem IDs being disbursed' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  item_ids?: string[];

  @ApiPropertyOptional({ type: [DisburseDeductionLineDto], description: 'Statutory deduction lines to create as sibling records' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisburseDeductionLineDto)
  deductions?: DisburseDeductionLineDto[];
}
