import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpsertFinanceCustomerDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiProperty({ example: 'Acme Ventures Limited' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'finance@acme.com' })
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

  @ApiPropertyOptional({ example: 'TIN-12345' })
  @IsOptional()
  @IsString()
  tax_number?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
