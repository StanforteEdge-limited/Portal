import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWHTRemittanceDto {
  @ApiProperty({ example: 'f3e8b369-0eca-454f-a8f8-46b780bc6264' })
  @IsUUID()
  deduction_type_id!: string;

  @ApiProperty({ example: 2026 })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  period_year!: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  @Max(12)
  period_month!: number;

  @ApiProperty({ example: 125000 })
  @IsNumber()
  total_amount!: number;

  @ApiProperty({ example: 'f3e8b369-0eca-454f-a8f8-46b780bc6264' })
  @IsUUID()
  paid_from_account_id!: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  remittance_date!: string;

  @ApiPropertyOptional({ example: 'FIRS-WHT-2026-04' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'f3e8b369-0eca-454f-a8f8-46b780bc6264' })
  @IsOptional()
  @IsUUID()
  receipt_file_id?: string;

  @ApiPropertyOptional({ example: 'Batch April 2026' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [String], description: 'Accrual IDs to include in this remittance' })
  @IsArray()
  @IsUUID('4', { each: true })
  accrual_ids!: string[];
}
