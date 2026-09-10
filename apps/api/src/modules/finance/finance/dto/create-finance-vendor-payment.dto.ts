import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

export class CreateFinanceVendorPaymentDto {
  @ApiPropertyOptional({ example: 'PAY-2026-0001' })
  @IsOptional()
  @IsString()
  payment_number?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  contact_id?: string;

  @ApiPropertyOptional({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsOptional()
  @IsUUID()
  bill_id?: string;

  @ApiProperty({ example: '3fef7e86-cf6a-4df7-b0b3-e350adf55e33' })
  @IsUUID()
  account_id!: string;

  @ApiProperty({ example: 45000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-03-18' })
  @IsOptional()
  @IsDateString()
  paid_at?: string;

  @ApiPropertyOptional({ example: 'Transfer ref' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
