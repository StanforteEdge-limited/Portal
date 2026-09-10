import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, MaxLength } from 'class-validator';

export class UpsertFinanceItemDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['service', 'product', 'other'])
  itemType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  chartAccountId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
