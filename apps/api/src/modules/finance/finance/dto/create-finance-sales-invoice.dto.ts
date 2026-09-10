import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Matches, Min, ValidateNested } from 'class-validator';

class FinanceSalesInvoiceLineDto {
  @ApiProperty({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsUUID()
  chart_account_id!: string;

  @ApiProperty({ example: 'Consulting services for March' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price!: number;
}

export class CreateFinanceSalesInvoiceDto {
  @ApiPropertyOptional({ example: 'INV-2026-0001' })
  @IsOptional()
  @IsString()
  invoice_number?: string;

  @ApiProperty({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsUUID()
  contact_id!: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional({ example: '4' })
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  fund_id?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  grant_id?: string;

  @ApiProperty({ example: '2026-03-18' })
  @IsDateString()
  invoice_date!: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ enum: ['draft', 'sent'] })
  @IsOptional()
  @IsIn(['draft', 'sent'])
  status?: 'draft' | 'sent';

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [FinanceSalesInvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinanceSalesInvoiceLineDto)
  lines!: FinanceSalesInvoiceLineDto[];
}
