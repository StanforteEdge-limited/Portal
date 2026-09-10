import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpsertContactPersonDto } from './upsert-contact-person.dto';

export class UpsertContactDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiProperty({ example: 'customer', enum: ['customer', 'vendor', 'both'] })
  @IsEnum(['customer', 'vendor', 'both'])
  contact_type!: string;

  @ApiPropertyOptional({ example: 'business', enum: ['individual', 'business'] })
  @IsOptional()
  @IsEnum(['individual', 'business'])
  sub_type?: string;

  @ApiProperty({ example: 'Global Office Supplies' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Global Office Supplies Ltd.' })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({ example: 'Global Office Supplies Limited' })
  @IsOptional()
  @IsString()
  legal_name?: string;

  @ApiPropertyOptional({ example: 'sales@globaloffice.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+2348000000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  billing_address?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  shipping_address?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'TIN-12345' })
  @IsOptional()
  @IsString()
  tax_number?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  payment_terms?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  credit_limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  opening_balance?: number;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [UpsertContactPersonDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpsertContactPersonDto)
  contact_persons?: UpsertContactPersonDto[];
}