import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpsertFinanceDonorDto {
  @ApiProperty({ example: 'MacArthur Foundation' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'grantor' })
  @IsOptional()
  @IsString()
  donor_type?: string;

  @ApiPropertyOptional({ example: 'grants@example.org' })
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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
