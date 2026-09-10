import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PrItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  qty!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  estimatedUnitCost!: number;
}

export class CreatePrDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(['goods', 'services', 'works'])
  category!: 'goods' | 'services' | 'works';

  @IsEnum(['post_delivery', 'pre_payment', 'milestone'])
  paymentPattern!: 'post_delivery' | 'pre_payment' | 'milestone';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrItemDto)
  items!: PrItemDto[];

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  budgetLineId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;
}
