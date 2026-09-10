import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GrnItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  qtyOrdered!: number;

  @IsNumber()
  qtyReceived!: number;

  @IsString()
  @IsNotEmpty()
  condition!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateGrnDto {
  @IsString()
  @IsNotEmpty()
  poId!: string;

  @IsString()
  @IsNotEmpty()
  receivedDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrnItemDto)
  items!: GrnItemDto[];

  @IsEnum(['satisfactory', 'partial', 'rejected'])
  overallCondition!: 'satisfactory' | 'partial' | 'rejected';

  @IsOptional()
  @IsString()
  notes?: string;
}
